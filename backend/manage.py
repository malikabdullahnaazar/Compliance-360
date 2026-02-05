#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import time

# Unconditionally monkey-patch time.monotonic to fix OverflowError on Windows with high uptime
# The error "timestamp too large to convert to C _PyTime_t" happens when the uptime is very large.
# We reset the epoch for this process to avoid the overflow in C extensions.
_start_time = time.time()
def safe_monotonic():
    return time.time() - _start_time
time.monotonic = safe_monotonic

def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
