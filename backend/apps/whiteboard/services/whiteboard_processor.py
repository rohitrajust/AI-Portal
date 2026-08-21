import asyncio
import io
import logging
import math
import base64
from typing import Any, Dict, Optional
from PIL import Image
import httpx
from openai import OpenAI

logger = logging.getLogger(__name__)


class ProcessedWhiteboard:
    def __init__(self, mermaid_code: str = "", canvas_json: Dict[str, Any] | None = None):
        self.mermaid_code = mermaid_code
        self.canvas_json = canvas_json or {}


class WhiteboardProcessor:
    def __init__(self):
        self.nvidia_service = None

    async def initialize(self):
        logger.info("Whiteboard processor ready")

    def _get_nvidia_client(self):
        """Get NVIDIA OpenAI client for vision processing."""
        from flask import current_app
        api_key = current_app.config.get("WHITEBOARD_NVIDIA_API_KEY")
        base_url = current_app.config.get("WHITEBOARD_NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
        return OpenAI(api_key=api_key, base_url=base_url, http_client=httpx.Client(verify=False, timeout=120.0))

    async def process_image(self, image_data: bytes, filename: str, content_type: str, diagram_type: Optional[str] = None, output_format: str = "mermaid") -> ProcessedWhiteboard:
        """Process whiteboard image using NVIDIA vision model."""
        await asyncio.sleep(0)  # yield
        
        try:
            # Convert image to base64
            image_b64 = base64.b64encode(image_data).decode()
            
            # Call NVIDIA vision model
            client = self._get_nvidia_client()
            
            response = client.chat.completions.create(
                model="meta/llama-3.2-11b-vision-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """Analyze this whiteboard/diagram image and generate a valid Mermaid flowchart.

IMPORTANT - Return ONLY valid Mermaid syntax:
- Use 'flowchart TD' or 'graph TD' for top-down flowcharts
- Use 'graph LR' for left-to-right
- Box syntax: N1["Text content"]
- Arrow syntax: N1 --> N2
- No markdown code fences (no triple backticks)
- No explanations or comments
- Ensure all quotes are balanced
- No incomplete lines

Example valid format:
graph TD
    A["Start"]
    B["Process"]
    C["End"]
    A --> B
    B --> C

Return ONLY the Mermaid code, nothing else."""
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{image_b64}"}
                            }
                        ]
                    }
                ],
                temperature=0.1,  # Lower temperature for more consistent syntax
                max_tokens=1500,
            )
            
            mermaid_code = response.choices[0].message.content.strip()
            
            # Clean up the response
            mermaid_code = self._clean_mermaid_code(mermaid_code)
            logger.info("Generated Mermaid code: %s", mermaid_code[:100])
            
            # Canvas JSON placeholder (can be enhanced later)
            canvas_json = {
                "version": "5.3.0",
                "objects": [],
                "source": "whiteboard_processor"
            }
            
            return ProcessedWhiteboard(mermaid_code=mermaid_code, canvas_json=canvas_json)
            
        except Exception as e:
            logger.exception("Error processing whiteboard image: %s", e)
            # Return valid fallback on error
            mermaid_code = 'graph TD\n    N1["Diagram processing failed"]'
            return ProcessedWhiteboard(mermaid_code=mermaid_code, canvas_json={"version": "5.3.0", "objects": []})
    
    def _clean_mermaid_code(self, code: str) -> str:
        """Clean and validate Mermaid code."""
        # Remove markdown code fences
        code = code.replace("```mermaid", "").replace("```", "").strip()
        
        # Remove any leading/trailing whitespace per line
        lines = [line.strip() for line in code.split('\n')]
        
        # Filter out empty lines and ensure we have content
        lines = [line for line in lines if line and not line.startswith('//')]
        
        if not lines:
            return 'graph TD\n    N1["No diagram detected"]'
        
        # Rejoin lines
        code = '\n    '.join(lines)
        
        # Ensure it starts with graph or flowchart keyword
        if not any(code.strip().startswith(kw) for kw in ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram']):
            code = 'graph TD\n    ' + code
        
        return code
