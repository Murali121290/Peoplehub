import os

root_dir = r"C:\Users\selvabharathp\Desktop\Peoplehub-Selva\frontend\src"

# 1. Update config/api.ts to load dynamically from VITE_API_URL
config_path = os.path.join(root_dir, "config", "api.ts")
with open(config_path, "w", encoding="utf-8") as f:
    f.write('export const API_URL = import.meta.env.VITE_API_URL || "http://10.1.6.178:5001";\n')
print(f"Updated config: {config_path}")

# 2. Update all other TSX/TS files to import and use API_URL
target_pattern = '${import.meta.env.VITE_API_URL || "http://10.1.6.178:5001"}'

for dirpath, _, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith(('.ts', '.tsx')):
            filepath = os.path.join(dirpath, filename)
            # Skip the config file itself
            if os.path.abspath(filepath) == os.path.abspath(config_path):
                continue
                
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                if target_pattern in content:
                    # Replace references with ${API_URL}
                    new_content = content.replace(target_pattern, '${API_URL}')
                    
                    # Clean up Socket.IO initialization in socket.ts
                    if filename == 'socket.ts':
                        new_content = new_content.replace('io(`${API_URL}`,', 'io(API_URL,')
                    
                    # Insert import statement if not already imported
                    if "import { API_URL }" not in new_content and "import { API_URL as" not in new_content:
                        # Calculate relative path to config/api
                        rel_dir = os.path.relpath(root_dir, dirpath)
                        if rel_dir == ".":
                            import_path = "./config/api"
                        else:
                            import_path = os.path.join(rel_dir, "config", "api").replace('\\', '/')
                        
                        import_statement = f'import {{ API_URL }} from "{import_path}";\n'
                        new_content = import_statement + new_content
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated: {filepath}")
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
