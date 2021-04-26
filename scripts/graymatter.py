import yaml

def parse(lines):
  content = []
  yaml_lines = []
  state = None
  for line_raw in lines:
    line = line_raw.rstrip('\r\n')
    # Update the state for this line.
    if state is None:
      if line == '---':
        state = 'graymatter'
        continue
      elif line.strip():
        state = 'content'
      else:
        continue
    elif state == 'graymatter':
      if line == '---':
        state = 'content'
        continue 
    # Process the line according to the state.
    if state == 'graymatter':
      yaml_lines.append(line)
    elif state == 'content':
      content.append(line_raw)
  # Parse the yaml
  try:
    metadata = yaml.safe_load('\n'.join(yaml_lines))
  except yaml.YAMLError as error:
    raise ValueError(f'Invalid YAML in gray-matter: {error}')
  return metadata, content
