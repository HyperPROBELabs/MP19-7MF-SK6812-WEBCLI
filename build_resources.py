#!/usr/bin/env python3
import os
import sys
from pathlib import Path
import htmlmin
import rjsmin
import csscompressor

def minify_content(filename, data):
    """Return minified bytes without touching source file"""

    try:
        if filename.endswith('.html'):
            text = data.decode('utf-8')
            text = htmlmin.minify(
                text,
                remove_comments=True,
                remove_empty_space=True
            )
            return text.encode('utf-8')

        elif filename.endswith('.css'):
            text = data.decode('utf-8')
            text = csscompressor.compress(text)
            return text.encode('utf-8')

        elif filename.endswith('.js'):
            text = data.decode('utf-8')
            text = rjsmin.jsmin(text)
            return text.encode('utf-8')

    except Exception as e:
        print(f"Warning: minify failed for {filename}: {e}")

    return data

def generate_c_array(data, var_name):
    """Generate C array from binary data"""
    lines = []
    for i in range(0, len(data), 16):
        chunk = data[i:i+16]
        hex_str = ', '.join(f'0x{b:02x}' for b in chunk)
        lines.append(f'    {hex_str},')
    return '\n'.join(lines)

def build_resources(frontend_dir, output_file):
    """Build resources.c from frontend files"""
    
    files_to_include = {
        'index.html': 'text/html',
        'styles.css': 'text/css',
        'app.js': 'application/javascript',
        'favicon.ico': 'image/vnd.microsoft.icon'
    }
    
    resources = []
    resource_data = []
    
    for filename, mime_type in files_to_include.items():
        filepath = os.path.join(frontend_dir, filename)
        
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found, skipping...")
            continue
        
        print(f"[+] Processing {filename}...")
        
        with open(filepath, 'rb') as f:
            data = f.read()

        orig_size = len(data)
        data = minify_content(filename, data)
        if len(data) != orig_size:
            print(f"    Minified: {orig_size} -> {len(data)} bytes ({100-(len(data)*100/orig_size):.1f}% saved)")
        
        var_name = f"file_data_{len(resources)}"
        c_array = generate_c_array(data, var_name)
        
        resource_data.append({
            'var_name': var_name,
            'data': c_array,
            'size': len(data),
        })
        
        resources.append({
            'filename': filename,
            'mime_type': mime_type,
            'var_name': var_name,
            'size': len(data),
        })
        
        print(f"    Size: {len(data)} bytes")
    
    # Generate resources.c
    c_code = """#include "resources.h"

"""
    
    # Add data arrays
    for res in resource_data:
        c_code += f"static const unsigned char {res['var_name']}[] = {{\n"
        c_code += res['data'] + "\n"
        c_code += "};\n\n"
    
    # Add file resources table
    c_code += "const FileResource file_resources[] = {\n"
    for res in resources:
        c_code += f"""    {{
        .filename = "{res['filename']}",
        .mime_type = "{res['mime_type']}",
        .data = {res['var_name']},
        .size = {res['size']},
    }},
"""
    c_code += "};\n\n"
    
    c_code += f"const int file_resources_count = {len(resources)};\n"
    
    with open(output_file, 'w') as f:
        f.write(c_code)
    
    print(f"\n[+] Generated {output_file}")
    print(f"[+] Total resources: {len(resources)}")

if __name__ == '__main__':
    frontend_dir = '.'
    output_file = 'resources.c'
    
    if len(sys.argv) > 1:
        frontend_dir = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    build_resources(frontend_dir, output_file)
