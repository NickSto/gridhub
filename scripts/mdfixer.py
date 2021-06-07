#!/usr/bin/env python3
"""Small Python hook for mdfixer.mjs."""
import argparse
import logging
import pathlib
import subprocess
import sys

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent


# Compatible with "placer" interface of `partition_content.EventHandler`.
def fix(old_path, new_path=None, simulate=True, exe=None, verbose=False):
  if exe is None:
    exe = SCRIPT_DIR/'mdfixer.mjs'
  if new_path is None:
    new_path = old_path
  if verbose:
    verbosity_args = []
  else:
    verbosity_args = ['-q']
  command = [exe, old_path, *verbosity_args, '-o', new_path]
  logging.info(f'Fix markdown of {old_path}, write to {new_path}')
  if not simulate:
    subprocess.run(command)


def make_argparser():
  parser = argparse.ArgumentParser(add_help=False)
  options = parser.add_argument_group('Options')
  options.add_argument('input', metavar='input.md', type=pathlib.Path,
    help='Input markdown file. WARNING: Will be overwritten if no output path is given.')
  options.add_argument('output', metavar='output.md', type=pathlib.Path, nargs='?',
    help='Output markdown file. Defaults to the input file.')
  options.add_argument('-e', '--exe', type=pathlib.Path)
  options.add_argument('-h', '--help', action='help',
    help='Print this argument help text and exit.')
  return parser


def main(argv):
  parser = make_argparser()
  args = parser.parse_args(argv[1:])
  fix(args.input, new_path=args.output, exe=args.exe)


if __name__ == '__main__':
  try:
    sys.exit(main(sys.argv))
  except BrokenPipeError:
    pass
