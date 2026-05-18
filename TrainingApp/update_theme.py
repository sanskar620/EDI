import os, re

def update_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # If already using useThemeStore, skip
    if 'useThemeStore' in content: return

    # Replace import
    content = content.replace("import { C } from '../../theme';", "import { useThemeStore } from '../../theme';")
    content = content.replace("import { C, TAB_H } from '../../theme';", "import { useThemeStore, TAB_H } from '../../theme';")
    
    # Inject hook at start of component
    # Also inject the dynamic const s inside the component
    func_pattern = re.compile(r'(export default function [a-zA-Z0-9_]+\([^)]*\)\s*\{)')
    if func_pattern.search(content):
        content = func_pattern.sub(r'\1\n  const { C, isDark } = useThemeStore();\n  const s = getStyles(C);', content)

    # Change const s = StyleSheet.create({ to const getStyles = (C: any) => StyleSheet.create({
    content = content.replace("const s = StyleSheet.create({", "const getStyles = (C: any) => StyleSheet.create({")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

src_dir = 'd:/Sponsored Project/TrainingApp/src'
for root, _, files in os.walk(src_dir):
    for filename in files:
        if filename.endswith('.tsx') or filename.endswith('.ts'):
            path = os.path.join(root, filename)
            if 'theme.ts' in path: continue
            update_file(path)

print('Updated all components for dynamic theme')
