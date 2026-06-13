import requests
import time
import json
import os

BASE_URL = "http://localhost:8000/api/v1"

def test_pipeline():
    print("Uploading file with quick preferences...")
    prefs = {
        "goal": "quick_overview",
        "depth": "quick"
    }
    
    with open("large_test.csv", "rb") as f:
        res = requests.post(f"{BASE_URL}/upload", files={"file": ("large_test.csv", f)}, data={"preferences": json.dumps(prefs)})
        
    print(res.status_code, res.text)
    if res.status_code != 200:
        return
        
    session_id = res.json()["session_id"]
    print(f"Session ID: {session_id}")
    
    print("Polling status...")
    while True:
        status_res = requests.get(f"{BASE_URL}/session/{session_id}/status")
        status = status_res.json()
        print(status.get("status"), status.get("status_detail"))
        if status["status"] in ["done", "failed"]:
            print(status)
            break
        time.sleep(2)
        
    if status["status"] == "done":
        print("Pipeline finished successfully.")
        
        # Check visualizations
        print("\nChecking visualizations...")
        viz_res = requests.get(f"{BASE_URL}/session/{session_id}/visualizations")
        viz = viz_res.json()
        charts = viz.get("charts", [])
        print(f"Total charts generated: {len(charts)} (Expect <= 4 for Quick Mode)")
        for c in charts:
            print(f"- {c['title']}: {c['image_url']}")
            assert c['image_url'] is not None and c['image_url'].endswith(".png")
            
        # Check clustering skipped
        print("\nChecking if clustering was skipped...")
        analysis_res = requests.get(f"{BASE_URL}/session/{session_id}/analysis")
        analysis = analysis_res.json()
        cluster = analysis.get("cluster", {})
        print("Cluster report:", cluster)
        assert cluster.get("skipped") is True
        
        # Check preferences_summary
        print("\nPreferences Summary:", status.get("preferences_summary"))
        assert "Quick overview" in status.get("preferences_summary")
        
        # Check Notebook download
        print("\nDownloading notebook...")
        nb_res = requests.get(f"{BASE_URL}/session/{session_id}/download/notebook", stream=True)
        print("Notebook download status:", nb_res.status_code)
        content_disp = nb_res.headers.get("Content-Disposition", "")
        print("Content-Disposition:", content_disp)
        
        with open("test_notebook.ipynb", "wb") as f:
            for chunk in nb_res.iter_content(chunk_size=8192):
                f.write(chunk)
                
        print("Saved to test_notebook.ipynb.")
        print("Checking notebook contents...")
        with open("test_notebook.ipynb", "r") as f:
            nb_data = json.load(f)
            
        has_setup = False
        has_save = False
        for cell in nb_data["cells"]:
            if cell["cell_type"] == "code":
                src = "".join(cell["source"])
                if "pd.read_csv('large_test.csv')" in src:
                    has_setup = True
                if "cleaned_large_test.csv" in src:
                    has_save = True
        
        if has_setup: print("✅ Notebook contains correct pd.read_csv")
        else: print("❌ Notebook MISSING correct pd.read_csv")
        
        if has_save: print("✅ Notebook contains correct to_csv with cleaned_filename")
        else: print("❌ Notebook MISSING correct to_csv with cleaned_filename")

if __name__ == "__main__":
    test_pipeline()
