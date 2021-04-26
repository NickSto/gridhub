#!/usr/bin/env python3
import argparse
import json
import logging
import os
import pathlib
import shutil
import sys
import graymatter

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
DESCRIPTION = """"""


def make_argparser():
  parser = argparse.ArgumentParser(add_help=False, description=DESCRIPTION)
  options = parser.add_argument_group('Options')
  options.add_argument('config', metavar='config.json', type=pathlib.Path, nargs='?',
    default=PROJECT_ROOT/'config.json',
    help='The site configuration file. The location of the important directories will be read from '
      'here.')
  options.add_argument('-n', '--simulate', action='store_true')
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

  with args.config.open() as config_file:
    config = json.load(config_file)

  md_content_dir = PROJECT_ROOT/config['build']['mdDir']
  vue_content_dir = PROJECT_ROOT/config['build']['vueDir']
  for dir_path in (md_content_dir, vue_content_dir):
    if not args.simulate:
      dir_path.mkdir(parents=True, exist_ok=True)
      clear_directory(dir_path)

  place_files(PROJECT_ROOT/config['contentDir'], md_content_dir, vue_content_dir, args.simulate)

  #TODO: Hot-reloading. Watch content directory and update any files that change.


def place_files(src_content_dir, md_content_dir, vue_content_dir, simulate=True):
  for src_file_path in get_all_files(src_content_dir):
    if src_file_path.name == 'index.md' and file_requires_vue(src_file_path):
      place_content_file('copy', src_file_path, src_content_dir, vue_content_dir, simulate)
      link_resource_files(src_file_path.parent, src_content_dir, vue_content_dir, simulate)
    else:
      place_content_file('link', src_file_path, src_content_dir, md_content_dir, simulate)


def get_all_files(root_dir, ext=None):
  for (dirpath_str, dirnames, filenames) in os.walk(root_dir):
    for filename in filenames:
      file_path = pathlib.Path(dirpath_str,filename)
      if ext is None or file_path.suffix == ext:
        yield file_path


def file_requires_vue(file_path):
  """Read the file to see if it requires `vue-remark`.
  Returns `True` if `components: true` is in the graymatter or if it finds `<slot ` or `<g-image `
  in the file contents."""
  with file_path.open() as file:
    try:
      metadata, content = graymatter.parse(file)
    except ValueError as error:
      logging.warning(f'Warning: Could not parse {file_path}: {error}')
      return None
  if isinstance(metadata, dict) and metadata.get('components') == True:
    return True
  if file_contains_components(content, ('slot', 'g-image')):
    return True
  return False


def file_contains_components(file_contents, components):
  query_strings = [f'<{tag} ' for tag in components]
  for line in file_contents:
    for query in query_strings:
      if query in line:
        return True
  return False


def place_content_file(action, src_file_path, src_content_dir, dst_content_dir, simulate=True):
  rel_file_path = src_file_path.relative_to(src_content_dir)
  dst_file_path = dst_content_dir/rel_file_path
  if dst_file_path.exists():
    logging.debug(f'{dst_file_path} already exists')
    return
  dst_file_dir = dst_file_path.parent
  dst_file_dir.mkdir(parents=True, exist_ok=True)
  if action == 'copy':
    logging.info(f'copy {src_file_path} -> {dst_file_path}')
    shutil.copy2(src_file_path, dst_file_path)
  elif action == 'link':
    link_path = pathlib.Path(os.path.relpath(src_file_path, start=dst_file_dir))
    logging.info(f'link {dst_file_path} -> {link_path}')
    if not simulate:
      os.symlink(link_path, dst_file_path)


def link_resource_files(src_file_dir, src_content_dir, dst_content_dir, simulate=True):
  for file_path in src_file_dir.iterdir():
    if file_path.is_file():
      place_content_file('link', file_path, src_content_dir, dst_content_dir, simulate=simulate)


def clear_directory(dir_path):
  for child_path in dir_path.iterdir():
    if child_path.is_dir():
      shutil.rmtree(child_path)
    else:
      os.remove(child_path)


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
