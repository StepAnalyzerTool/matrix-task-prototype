"""Host the original browser task without routing responses through Python."""
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).resolve().parent


def task_html():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for filename in ("engine.js", "hr.js", "app.js"):
        script = (ROOT / filename).read_text(encoding="utf-8")
        html = html.replace(f'<script src="{filename}"></script>', f"<script>{script}</script>")
    return html


st.set_page_config(page_title="Matrix Lab", page_icon="🧩", layout="wide")
# Let the task fill the browser viewport; no researcher tools outside its own screens.
st.markdown("""<style>
html, body, [data-testid="stAppViewContainer"], [data-testid="stMain"] {overflow:hidden !important;}
[data-testid="stHeader"], [data-testid="stToolbar"], [data-testid="stDecoration"],
[data-testid="stStatusWidget"], [data-testid="stAppDeployButton"], #MainMenu, footer {display:none !important;}
[data-testid="stMainBlockContainer"] {padding:0 !important;max-width:none !important;}
[data-testid="stVerticalBlock"] {gap:0 !important;}
[data-testid="stElementContainer"]:has(iframe) {position:fixed;inset:0;width:100vw;height:100dvh;}
iframe {width:100% !important;height:100dvh !important;border:0;display:block;}
</style>""", unsafe_allow_html=True)
components.html(task_html(), height=800, scrolling=False)
