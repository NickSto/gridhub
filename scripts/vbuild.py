#!/usr/bin/env python3
import argparse
import logging
import os
import pathlib
import subprocess
import sys

import psutil

import partition_content

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
VERBOSITY_ARGS = {logging.DEBUG:'--debug', logging.INFO:'--verbose', logging.CRITICAL:'--quiet'}
DESCRIPTION = """Build or serve the site."""


def make_argparser():
  parser = argparse.ArgumentParser(prog='build.sh', add_help=False, description=DESCRIPTION)
  options = parser.add_argument_group('Options')
  options.add_argument('action', choices=('build','develop'), default='build', nargs='?',
    help='Action. "build" creates the static files for the entire website. "develop" runs a server '
      'which serves the site locally (and builds pages on demand).')
  options.add_argument('-c', '--config', type=pathlib.Path, default=PROJECT_ROOT/'config.json',
    help='The site configuration file. The location of the important directories will be read from '
      'here. Default: %(default)s')
  options.add_argument('-M', '--reserved-mem', type=float, default=1,
    help='The amount of memory to reserve for the system. The limit given to node will be the '
      'total amount of system memory minus this many gigabytes. Default: %(default)s')
  options.add_argument('-C', '--check-args', action='store_true',
    help='Return an error if the arguments are invalid. Otherwise do nothing.')
  options.add_argument('-h', '--help', action='store_true',
    help='Print this argument help text and exit.')
  logs = parser.add_argument_group('Logging')
  logs.add_argument('-l', '--log', type=argparse.FileType('w'), default=sys.stderr,
    help='Print log messages to this file instead of to stderr. Warning: Will overwrite the file.')
  volume = logs.add_mutually_exclusive_group()
  volume.add_argument('-q', '--quiet', dest='volume', action='store_const', const=logging.CRITICAL,
    default=logging.WARNING)
  volume.add_argument('-v', '--verbose', dest='volume', action='store_const', const=logging.INFO)
  volume.add_argument('-D', '--debug', dest='volume', action='store_const', const=logging.DEBUG)
  return parser


def main(argv):

  parser = make_argparser()
  args = parser.parse_args(argv[1:])

  logging.basicConfig(stream=args.log, level=args.volume, format='%(message)s')

  if args.help:
    parser.print_help()
    return 1

  if args.check_args:
    return

  os.chdir(PROJECT_ROOT)

  logging.warning('Running partition_content.py..')
  partition_content.preprocess(args.config)

  if args.action == 'develop':
    logging.warning('Starting hot reloader..')
    verbosity = VERBOSITY_ARGS[logging.getLogger().getEffectiveLevel()]
    subprocess.Popen([PROJECT_ROOT/'scripts/hotreloader.py', verbosity, args.config])

  node_mem = get_node_mem(reserved=args.reserved_mem)
  os.environ['NODE_OPTIONS'] = f'--max-old-space-size={node_mem}'
  logging.warning(f'Using {node_mem} MB memory limit for node.')

  if args.action == 'build':
    subprocess.run(['gridsome', 'build'])
  elif args.action == 'develop':
    try:
      subprocess.run(['gridsome', 'develop'])
    except KeyboardInterrupt:
      pass


def get_node_mem(reserved=1):
  """Get the amount of memory to give to node, in MB.
  It's the total amount of system memory minus `reserved` GB."""
  mem = psutil.virtual_memory()
  return round(mem.total/1024/1024 - reserved*1024)


def fail(message):
  logging.critical(f'Error: {message}')
  if __name__ == '__main__':
    sys.exit(1)
  else:
    raise Exception(message)


if __name__ == '__main__':
  try:
    sys.exit(main(sys.argv))
  except BrokenPipeError:
    pass
