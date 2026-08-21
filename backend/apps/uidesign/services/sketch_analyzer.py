from openai import OpenAI
import base64
import os
import httpx
from config import Config


def analyze_sketch(image_path):
    """
    Analyze a UI sketch image using NVIDIA's vision model.
    Returns a detailed description of the UI elements found in the sketch.
    """
    try:
        # Determine TLS verification based on config
        verify_ssl = Config.NVIDIA_TLS_VERIFY
        ca_bundle = Config.NVIDIA_CA_BUNDLE
        
        if verify_ssl and ca_bundle:
            verify = ca_bundle
        else:
            verify = verify_ssl

        client = OpenAI(
            base_url=Config.NVIDIA_BASE_URL,
            api_key=Config.UIDESIGN_NVIDIA_API_KEY,
            http_client=httpx.Client(
                verify=verify,
                timeout=120.0
            )
        )

        with open(image_path, "rb") as file:
            image_b64 = base64.b64encode(
                file.read()
            ).decode()

        response = client.chat.completions.create(
            model=Config.UIDESIGN_NVIDIA_VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """
Analyze this UI sketch.

Identify:
- page type
- layout
- forms
- buttons
- cards
- tables
- navigation
- user interactions

Return a detailed UI description.
"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_b64}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.2,
            max_tokens=1000
        )

        return response.choices[0].message.content

    except Exception as e:
        print("VISION MODEL ERROR:")
        print(type(e))
        print(e)

        return f"Sketch analysis failed: {str(e)}"
