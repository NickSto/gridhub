#!/usr/bin/env python3
import argparse
import json
import pathlib
import logging
import subprocess
import sys

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
DESCRIPTION = """Perform all the steps required before a build or develop step."""


def make_argparser():
  parser = argparse.ArgumentParser(add_help=False, description=DESCRIPTION)
  options = parser.add_argument_group('Options')
  options.add_argument('config', metavar='config.json', type=pathlib.Path, nargs='?',
    default=PROJECT_ROOT/'config.json',
    help='The site configuration file. The location of the important directories will be read from '
      'here.')
  options.add_argument('-h', '--help', action='help',
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

  preprocess(args.config)


def read_config(config_path):
  with config_path.open() as config_file:
    config = json.load(config_file)
  return config


def preprocess(config_path):
  logging.info('Running partition-content.py..')
  partition_script = PROJECT_ROOT/'scripts/partition-content.py'
  cmd = [partition_script, config_path]
  result = subprocess.run(cmd)
  if result.returncode != 0:
    fail('Command failed: $ '+' '.join(map(str, cmd)))


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
