import os
import requests
from pathlib import Path
 
# Configurăm endpoint-ul API-ului tău local
INGEST_URL = "http://localhost:7799/ingest"
 
# Determinăm calea către folderul "data".
# Presupunând că scriptul e în code/backend/scripts/, mergem 3 foldere mai sus.
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent.parent / "data"
 
def ingest_documents():
    if not DATA_DIR.exists():
        print(f"Eroare: Nu am gasit folderul data la {DATA_DIR.resolve()}")
        return
 
    print(f"Caut documente in: {DATA_DIR.resolve()}\n")
 
    # Parcurgem toate fișierele .md din folder
    for filepath in DATA_DIR.glob("*.md"):
        # Sărim peste README.md, deoarece nu conține date bancare
        if filepath.name.lower() == "readme.md":
            print(f"Skipping {filepath.name}...")
            continue
 
        print(f"Ingesting {filepath.name}...")
 
        # Citim conținutul fișierului
        with open(filepath, "r", encoding="utf-8") as file:
            content = file.read()
 
        # Construim payload-ul pentru POST request
        payload = {
            "text": content,
            "strategy": "dynamic",  # Folosim strategia dynamic
            "source": filepath.stem # Folosim numele fisierului (fara .md) ca sursa
        }
 
        # Trimitem cererea catre backend
        try:
            response = requests.post(INGEST_URL, json=payload)
            response.raise_for_status() # Aruncă eroare dacă statusul nu e 2xx
            print(f"  -> Succes! (Status: {response.status_code})")
        except requests.exceptions.RequestException as e:
            print(f"  -> EROARE la {filepath.name}: {e}")
 
if __name__ == "__main__":
    print("Incepem procesul de ingestie...")
    ingest_documents()
    print("\nProces finalizat!")