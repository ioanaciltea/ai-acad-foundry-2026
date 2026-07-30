import os
import glob
from pathlib import Path
import urllib.request
import json

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
API_URL = "http://localhost:7799/ingest"

def parse_frontmatter(file_path):
    """
    Extrage metadatele YAML simple (title, product, audience, effective, version) 
    și conținutul efectiv dintr-un fișier Markdown.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    
    metadata = {}
    content_lines = []
    in_frontmatter = False
    frontmatter_ended = False

    for line in lines:
        if line.strip() == "---" and not frontmatter_ended:
            if not in_frontmatter:
                in_frontmatter = True
            else:
                in_frontmatter = False
                frontmatter_ended = True
            continue

        if in_frontmatter:
            parts = line.split(":", 1)
            if len(parts) == 2:
                key = parts[0].strip()
                val = parts[1].strip()
                metadata[key] = val
        else:
            content_lines.append(line)

    return metadata, "".join(content_lines).strip()

def ingest_file(file_path):
    metadata, text = parse_frontmatter(file_path)
    source_name = file_path.name

    payload = {
        "text": text,
        "strategy": "dynamic", 
        "source": source_name,
        # imbun2
        "metadata": metadata 
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL, 
        data=req_data, 
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            print(f"[SUCCES] Încărcat: {source_name} -> Răspuns: {response.status}")
    except Exception as e:
        print(f"[EROARE] Eșec la fișierul {source_name}: {e}")

def main():
    if not DATA_DIR.exists():
        print(f"[EROARE] Directorul {DATA_DIR} nu a fost găsit. Rulează scriptul din calea corectă.")
        return

    markdown_files = list(DATA_DIR.glob("*.md"))
    excluded = ["README.md", "questions.md"]
    files_to_ingest = [f for f in markdown_files if f.name not in excluded]

    print(f"Am găsit {len(files_to_ingest)} fișiere de corpus pentru ingestie.")

    for file_path in files_to_ingest:
        ingest_file(file_path)

    print("Ingestia corpusului s-a încheiat!")

if __name__ == "__main__":
    main()