import os

root_dir = r"C:\Users\selvabharathp\Desktop\Peoplehub-Selva\frontend\src"

for dirpath, _, filenames in os.walk(root_dir):
    for filename in filenames:
        if filename.endswith(('.ts', '.tsx')):
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                # Identify lines that import API_URL
                import_indices = []
                for idx, line in enumerate(lines):
                    if "import { API_URL } from" in line:
                        import_indices.append(idx)
                
                # If there are duplicate imports, keep only the first one
                if len(import_indices) > 1:
                    # Remove duplicates in reverse order to keep indices valid
                    for idx in sorted(import_indices[1:], reverse=True):
                        lines.pop(idx)
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.writelines(lines)
                    print(f"Removed duplicate API_URL import from: {filepath}")
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
