#!/usr/bin/env python3
"""
Regenerate data.js and xperia_games.db from the Xperia Play Archived Games xlsx.

Usage:
    python tools/regenerate_data.py [path/to/release.xlsx]

Defaults to "Xperia Play Archived Games Release 11.xlsx" at repo root.
Writes both data.js (front-end) and xperia_games.db (SQLite) at repo root,
preserving the historical 16-field schema.
The xlsx file itself is gitignored — keep it locally to re-run this script.
"""
import json
import sqlite3
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
T_TAG = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'

# Excel column letter -> internal field name (DB schema is frozen at 16 fields).
# Note: column I is labelled "Year" in Release 11 but stays under the legacy
# `size_kb` key to keep the front-end DB structure unchanged.
COLUMN_MAP = [
    ('A',  'stars'),
    ('B',  'type'),
    ('C',  'name'),
    ('D',  'filename'),
    ('E',  'status'),
    ('F',  'publisher'),
    ('G',  'genre'),
    ('H',  'version'),
    ('I',  'size_kb'),
    ('J',  'apk'),
    ('K',  'data'),
    ('L',  'dpad'),
    ('M',  'touchpad'),
    ('N',  'game_buttons_mapped'),
    ('X',  'virus_total'),
    ('AB', 'notes'),
]

FIELD_ORDER = ['id'] + [f for _, f in COLUMN_MAP]


def split_ref(ref: str):
    i = 0
    while i < len(ref) and ref[i].isalpha():
        i += 1
    return ref[:i], int(ref[i:])


def load_shared_strings(zf: zipfile.ZipFile):
    try:
        with zf.open('xl/sharedStrings.xml') as f:
            root = ET.parse(f).getroot()
    except KeyError:
        return []
    return [
        ''.join(t.text or '' for t in si.iter(T_TAG))
        for si in root.findall('a:si', NS)
    ]


def load_rows(zf: zipfile.ZipFile, strings):
    with zf.open('xl/worksheets/sheet1.xml') as f:
        root = ET.parse(f).getroot()
    rows = []
    for row in root.findall('.//a:row', NS):
        cells = {}
        for c in row.findall('a:c', NS):
            ref = c.attrib.get('r')
            if not ref:
                continue
            col, _ = split_ref(ref)
            t = c.attrib.get('t', '')
            if t == 'inlineStr':
                is_el = c.find('a:is', NS)
                v = ''.join(t.text or '' for t in is_el.iter(T_TAG)) if is_el is not None else ''
            else:
                v_el = c.find('a:v', NS)
                v = v_el.text if v_el is not None else ''
                if t == 's' and v:
                    v = strings[int(v)]
            cells[col] = v
        rows.append(cells)
    return rows


def normalize(value: str) -> str:
    if value is None:
        return ''
    return value.strip()


def main():
    repo = Path(__file__).resolve().parent.parent
    if len(sys.argv) > 1:
        xlsx_path = Path(sys.argv[1]).resolve()
    else:
        xlsx_path = repo / 'Xperia Play Archived Games Release 11.xlsx'
    out_path = repo / 'data.js'

    if not xlsx_path.exists():
        sys.stderr.write(f'ERROR: spreadsheet not found: {xlsx_path}\n')
        sys.exit(1)

    with zipfile.ZipFile(xlsx_path) as zf:
        strings = load_shared_strings(zf)
        rows = load_rows(zf, strings)

    if not rows:
        sys.stderr.write('ERROR: no rows in worksheet\n')
        sys.exit(1)

    games = []
    for row in rows[1:]:  # skip header
        name = normalize(row.get('C', ''))
        if not name:
            continue
        game = {'id': len(games) + 1}
        for col, field in COLUMN_MAP:
            game[field] = normalize(row.get(col, ''))
        games.append({k: game[k] for k in FIELD_ORDER})

    def uniq_sorted(values):
        return sorted({v for v in values if v}, key=lambda s: s.lower())

    filter_types    = uniq_sorted(g['type']   for g in games)
    filter_statuses = uniq_sorted(g['status'] for g in games)
    filter_genres   = uniq_sorted(g['genre']  for g in games)
    filter_stars    = uniq_sorted(g['stars']  for g in games)

    parts = [
        'const GAMES_DATA = '   + json.dumps(games)           + ';\n\n',
        'const FILTER_TYPES = ' + json.dumps(filter_types)    + ';\n',
        'const FILTER_STATUSES = ' + json.dumps(filter_statuses) + ';\n',
        'const FILTER_GENRES = ' + json.dumps(filter_genres)  + ';\n',
        'const FILTER_STARS = '  + json.dumps(filter_stars)   + ';\n',
    ]
    out_path.write_text(''.join(parts), encoding='utf-8')
    print(f'Wrote {len(games)} games to {out_path}')

    db_path = repo / 'xperia_games.db'
    write_sqlite(db_path, games)
    print(f'Wrote {len(games)} games to {db_path}')

    print(f'  types:    {len(filter_types)}')
    print(f'  statuses: {len(filter_statuses)}')
    print(f'  genres:   {len(filter_genres)}')
    print(f'  stars:    {len(filter_stars)}')


def write_sqlite(db_path: Path, games):
    """Recreate the games table from scratch with the canonical 16-field schema."""
    if db_path.exists():
        db_path.unlink()
    con = sqlite3.connect(db_path)
    try:
        con.executescript("""
            CREATE TABLE games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stars TEXT,
                type TEXT,
                name TEXT,
                filename TEXT,
                status TEXT,
                publisher TEXT,
                genre TEXT,
                version TEXT,
                size_kb TEXT,
                apk TEXT,
                data TEXT,
                dpad TEXT,
                touchpad TEXT,
                game_buttons_mapped TEXT,
                virus_total TEXT,
                notes TEXT
            );
            CREATE INDEX idx_games_name      ON games(name);
            CREATE INDEX idx_games_type      ON games(type);
            CREATE INDEX idx_games_status    ON games(status);
            CREATE INDEX idx_games_publisher ON games(publisher);
        """)
        cols = ['id', 'stars', 'type', 'name', 'filename', 'status', 'publisher',
                'genre', 'version', 'size_kb', 'apk', 'data', 'dpad', 'touchpad',
                'game_buttons_mapped', 'virus_total', 'notes']
        placeholders = ','.join('?' * len(cols))
        con.executemany(
            f'INSERT INTO games ({",".join(cols)}) VALUES ({placeholders})',
            [tuple(g[c] for c in cols) for g in games],
        )
        con.commit()
    finally:
        con.close()


if __name__ == '__main__':
    main()
