import os
from dotenv import load_dotenv
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
env_path = base_dir / '.env'
print(f"Base Dir: {base_dir}")
print(f"Env Path: {env_path}")
print(f"Enn Path exists: {env_path.exists()}")

load_dotenv(env_path)
print(f"APP_ENV: {os.environ.get('APP_ENV')}")
print(f"DB_ENGINE: {os.environ.get('DB_ENGINE')}")
