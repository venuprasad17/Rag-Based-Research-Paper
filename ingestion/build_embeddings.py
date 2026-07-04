import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

class EmbeddingResult(list):
    """A wrapper class that behaves like a list but exposes a .shape property to match numpy array interface"""
    @property
    def shape(self):
        return (len(self),)
        
    def tolist(self):
        return list(self)

class HuggingFaceEmbeddings:
    """API-based replacement for local SentenceTransformer model"""
    def __init__(self):
        self.model_id = "sentence-transformers/all-mpnet-base-v2"
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_id}"
        self.api_key = os.getenv('HF_API_KEY') or os.getenv('HF_TOKEN')
        
    def encode(self, texts, show_progress_bar=False):
        # Determine if input is a single text string or list of texts
        is_single = isinstance(texts, str)
        inputs = [texts] if is_single else list(texts)
            
        headers = {}
        if self.api_key:
            token = self.api_key.strip()
            if not token.startswith("Bearer "):
                token = f"Bearer {token}"
            headers["Authorization"] = token
            
        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json={"inputs": inputs, "options": {"wait_for_model": True}},
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if not isinstance(result, list):
                        raise ValueError(f"Unexpected response format: {result}")
                        
                    if is_single:
                        return EmbeddingResult(result[0])
                    else:
                        return [EmbeddingResult(item) for item in result]
                        
                elif response.status_code == 503:
                    # Model loading, wait and retry
                    error_json = response.json()
                    wait_time = error_json.get('estimated_time', 5)
                    print(f"Hugging Face model loading, waiting {wait_time}s (attempt {attempt+1}/{max_retries})...")
                    time.sleep(min(wait_time, 10))
                else:
                    raise Exception(f"HF API Error {response.status_code}: {response.text}")
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                time.sleep(2)
        
        raise Exception("Failed to generate embeddings after maximum retries")

def load_embedding_model():
    """Returns a client for HuggingFace embeddings API that mimics the local model interface"""
    return HuggingFaceEmbeddings()

def generate_embeddings(texts, model):
    """Generate embeddings using Hugging Face API"""
    return model.encode(texts)

if __name__ == "__main__":
    model = load_embedding_model()
    
    # Test embedding
    test_text = "Deep learning for image recognition"
    embedding = model.encode(test_text)
    print(f"\nTest embedding shape: {embedding.shape}")
    print(f"Embedding dimensions: {len(embedding)}")