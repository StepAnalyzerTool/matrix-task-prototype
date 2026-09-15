"""Host the original browser task without routing responses through Python."""
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

ROOT = Path(__file__).resolve().parent


def task_html():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for filename in ("engine.js", "app.js"):
        script = (ROOT / filename).read_text(encoding="utf-8")
        html = html.replace(f'<script src="{filename}"></script>', f"<script>{script}</script>")
    return html


st.set_page_config(page_title="Matrix Lab", page_icon="🧩", layout="wide")
st.caption("Matrix Lab · Student demonstration · Download results before closing")
components.html(task_html(), height=1150, scrolling=True)
