# usage: tap.py ui.xml "regex"  -> prints "x y" of first node whose text/desc matches
import re, sys, xml.etree.ElementTree as ET
try: root = ET.parse(sys.argv[1]).getroot()
except Exception: sys.exit(1)
rx = re.compile(sys.argv[2], re.I)
for n in root.iter('node'):
    if rx.search(n.get('text', '') or '') or rx.search(n.get('content-desc', '') or ''):
        a = list(map(int, re.findall(r'\d+', n.get('bounds'))))
        print((a[0] + a[2]) // 2, (a[1] + a[3]) // 2); sys.exit(0)
sys.exit(1)
