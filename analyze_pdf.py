import PyPDF2
import sys

def analyze_pdf(pdf_path):
    """Analyze PDF to check layout and structure"""
    print(f"Analyzing PDF: {pdf_path}\n")
    print("=" * 60)
    
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            
            # Basic info
            print(f"Total Pages: {len(reader.pages)}")
            print(f"PDF Metadata:")
            if reader.metadata:
                for key, value in reader.metadata.items():
                    print(f"  {key}: {value}")
            print("\n" + "=" * 60)
            
            # Analyze first few pages
            pages_to_check = min(3, len(reader.pages))
            
            for i in range(pages_to_check):
                page = reader.pages[i]
                print(f"\n📄 PAGE {i + 1}:")
                print("-" * 60)
                
                # Extract text
                text = page.extract_text()
                
                # Get page dimensions
                mediabox = page.mediabox
                width = float(mediabox.width)
                height = float(mediabox.height)
                print(f"Page Size: {width:.2f} x {height:.2f} points")
                print(f"Page Size (mm): {width*0.352778:.2f} x {height*0.352778:.2f}")
                
                # Check for two-column indicators
                lines = text.split('\n')
                print(f"Total Lines: {len(lines)}")
                
                # Show first 30 lines
                print(f"\n📝 Content Preview (first 30 lines):")
                print("-" * 60)
                for idx, line in enumerate(lines[:30], 1):
                    if line.strip():
                        print(f"{idx:2d}: {line[:70]}")
                
                # Check for keywords that indicate structure
                has_abstract = 'ABSTRACT' in text.upper()
                has_references = 'REFERENCES' in text.upper()
                
                print(f"\n🔍 Structure Indicators:")
                print(f"  Contains 'ABSTRACT': {has_abstract}")
                print(f"  Contains 'REFERENCES': {has_references}")
                
            print("\n" + "=" * 60)
            print("✅ Analysis Complete!")
            
    except FileNotFoundError:
        print(f"❌ Error: File not found - {pdf_path}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error analyzing PDF: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    pdf_path = r"C:\Users\Admin\Desktop\projects\report-builder-ai-main\anti_spoofing.pdf"
    analyze_pdf(pdf_path)
