#!/usr/bin/env python3
"""
Pickle serialization helper for Node.js ZMQ client.
This script handles conversion between JSON and Python pickle format.
"""

import sys
import json
import pickle
import base64
import struct

def serialize_data():
    """Read JSON from stdin and output pickle bytes to stdout."""
    try:
        # Read JSON data from stdin
        json_data = sys.stdin.read()
        
        # Parse JSON to Python object
        data = json.loads(json_data)
        
        # Serialize with pickle
        pickled = pickle.dumps(data, protocol=pickle.HIGHEST_PROTOCOL)
        
        # Write binary data to stdout
        sys.stdout.buffer.write(pickled)
        sys.stdout.buffer.flush()
        
    except Exception as e:
        sys.stderr.write(f"Serialization error: {str(e)}\n")
        sys.exit(1)

def deserialize_data():
    """Read pickle bytes from stdin and output JSON to stdout."""
    try:
        # Read binary data from stdin
        pickled_data = sys.stdin.buffer.read()
        
        # Deserialize with pickle
        data = pickle.loads(pickled_data)
        
        # Convert to JSON and write to stdout
        json_data = json.dumps(data, ensure_ascii=False)
        print(json_data)
        sys.stdout.flush()
        
    except Exception as e:
        sys.stderr.write(f"Deserialization error: {str(e)}\n")
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: pickle_helper.py [serialize|deserialize]\n")
        sys.exit(1)
    
    mode = sys.argv[1]
    
    if mode == 'serialize':
        serialize_data()
    elif mode == 'deserialize':
        deserialize_data()
    else:
        sys.stderr.write(f"Unknown mode: {mode}\n")
        sys.exit(1)

if __name__ == '__main__':
    main()