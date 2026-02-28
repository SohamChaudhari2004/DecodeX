import pypdf
import sys

def extract_text(pdf_path, txt_path):
    try:
        with open(pdf_path, 'rb') as file:
            reader = pypdf.PdfReader(file)
            text = ''
            for page in reader.pages:
                text += page.extract_text() + '\n'
        with open(txt_path, 'w', encoding='utf-8') as out_file:
            out_file.write(text)
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_text("Case 03 - Stage 3 Guidelines.pdf", "Case 03 - Stage 3 Guidelines.txt")
