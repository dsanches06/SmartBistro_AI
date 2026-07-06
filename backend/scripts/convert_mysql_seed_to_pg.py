from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
src = root / 'database' / 'mysql' / 'seed.sql'
dst = root / 'database' / 'neon_vercel' / 'seed_default_neon.sql'
text = src.read_text(encoding='utf-8')

# Remove database selection
text = re.sub(r"(?mi)^\s*USE\s+smartbistro;\s*\n?", '', text)

# Normalize INTERVAL syntax to PostgreSQL style
unit_map = {'DAY': 'day', 'HOUR': 'hour', 'MINUTE': 'minute'}

def repl_interval(match):
    value = int(match.group(1))
    unit = unit_map[match.group(2).upper()]
    if abs(value) != 1:
        unit += 's'
    return f"INTERVAL '{value} {unit}'"

text = re.sub(r"INTERVAL\s+(-?\d+)\s+(DAY|HOUR|MINUTE)", repl_interval, text, flags=re.IGNORECASE)

# Replace DATE_ADD(CURDATE(), INTERVAL ...) + INTERVAL ... patterns
text = re.sub(
    r"DATE_ADD\(CURDATE\(\),\s*INTERVAL\s+(-?\d+)\s+DAY\)\s*\+\s*INTERVAL\s+'?(-?\d+)'?\s+(HOUR|MINUTE)",
    lambda m: f"CURRENT_TIMESTAMP + INTERVAL '{int(m.group(1))} days' + INTERVAL '{int(m.group(2))} {unit_map[m.group(3).upper()]}{'s' if abs(int(m.group(2))) != 1 else ''}'",
    text,
    flags=re.IGNORECASE,
)

# Replace DATE_ADD(CURDATE(), INTERVAL ...) standalone
text = re.sub(
    r"DATE_ADD\(CURDATE\(\),\s*INTERVAL\s+(-?\d+)\s+DAY\)",
    lambda m: f"CURRENT_TIMESTAMP + INTERVAL '{int(m.group(1))} days'",
    text,
    flags=re.IGNORECASE,
)

# Replace DATE_SUB(NOW(), INTERVAL x DAY)
text = re.sub(
    r"DATE_SUB\(NOW\(\),\s*INTERVAL\s+(\d+)\s+DAY\)",
    lambda m: f"NOW() - INTERVAL '{int(m.group(1))} days'",
    text,
    flags=re.IGNORECASE,
)

# Normalize any remaining NOW() style intervals
text = re.sub(
    r"NOW\(\)\s*([-+])\s*INTERVAL\s+'?(-?\d+)'?\s+(DAY|HOUR|MINUTE)",
    lambda m: f"NOW() {m.group(1)} INTERVAL '{int(m.group(2))} {unit_map[m.group(3).upper()]}{'s' if abs(int(m.group(2))) != 1 else ''}'",
    text,
    flags=re.IGNORECASE,
)

# Save the converted seed
Path(dst.parent).mkdir(parents=True, exist_ok=True)
dst.write_text(text, encoding='utf-8')
print(f'Wrote {len(text.splitlines())} lines to {dst}')
