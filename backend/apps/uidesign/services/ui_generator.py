import os
import uuid
import traceback
import re
import httpx
from openai import OpenAI
from config import Config


def remove_thinking(text):
    """
    Removes Qwen <think>...</think> blocks that may
    accidentally appear in the model response.
    """
    if not text:
        return ""

    text = text.strip()

    text = re.sub(
        r"<think\b[^>]*>.*?</think\s*>",
        "",
        text,
        flags=re.IGNORECASE | re.DOTALL
    )

    return text.strip()


def clean_html_response(text):
    """
    Extracts the HTML document from the Groq response.

    Removes:
    - <think>...</think>
    - Markdown code fences
    - Text before HTML
    - Text after HTML
    """
    if not text:
        return ""

    text = text.strip()

    # Remove thinking
    text = remove_thinking(text)

    # Remove Markdown code fences
    text = re.sub(
        r"```html\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"```\s*",
        "",
        text
    )

    text = text.strip()

    # Find DOCTYPE
    doctype_match = re.search(
        r"<!DOCTYPE\s+html\s*>",
        text,
        flags=re.IGNORECASE
    )

    # Find <html>
    html_match = re.search(
        r"<html\b[^>]*>",
        text,
        flags=re.IGNORECASE
    )

    # Find beginning of HTML
    if doctype_match:
        start = doctype_match.start()
    elif html_match:
        start = html_match.start()
    else:
        # No HTML extraction/validation here.
        # Return the cleaned model response as-is.
        return text.strip()

    text = text[start:]

    # Remove anything after </html>
    end_match = re.search(
        r"</html\s*>",
        text,
        flags=re.IGNORECASE
    )

    if end_match:
        text = text[
            :end_match.end()
        ]

    # Add DOCTYPE if model returned <html> without it
    if not re.match(
        r"^\s*<!DOCTYPE\s+html\s*>",
        text,
        flags=re.IGNORECASE
    ):
        text = (
            "<!DOCTYPE html>\n"
            + text
        )

    return text.strip()


def generate_ui_html(prompt):
    """
    Generate HTML UI from a prompt using Groq's HTML generation model.
    Returns the filename of the generated HTML file.
    """
    try:
        print("\n===================================")
        print("STEP 3 : GENERATING HTML UI")
        print("===================================")

        # Check prompt
        if not prompt or not prompt.strip():
            print(
                "ERROR: Empty UI generation prompt"
            )
            return None

        # Display model
        print("\nUsing Groq model:")
        print(
            Config.UIDESIGN_GROQ_GENERATOR_MODEL
        )

        # Remove accidental thinking from prompt
        prompt = remove_thinking(prompt)

        if not prompt:
            print(
                "ERROR: Prompt became empty after "
                "removing thinking content"
            )
            return None

        # Limit prompt size
        MAX_PROMPT_CHARS = 6000

        if len(prompt) > MAX_PROMPT_CHARS:
            print(
                f"\nPrompt too long: "
                f"{len(prompt)} characters"
            )
            prompt = prompt[
                :MAX_PROMPT_CHARS
            ]
            print(
                f"Prompt truncated to: "
                f"{len(prompt)} characters"
            )

        # Prompt preview
        print("\nCleaned Prompt preview:")
        print(
            prompt[:1000]
        )

        print(
            "\nPrompt characters:",
            len(prompt)
        )

        # HTML generation instruction
        html_instruction = f"""

Create a complete standalone HTML5 webpage based on the
following UI requirements.

IMPORTANT OUTPUT RULES:

- Return ONLY the final HTML document.
- Do NOT return a UI-generation prompt.
- Do NOT explain anything.
- Do NOT provide reasoning.
- Do NOT provide analysis.
- Do NOT include <think> tags.
- Do NOT use Markdown.
- Do NOT use ```html code fences.
- Start the response with <!DOCTYPE html>.
- End the response with </html>.
- Include <html>, <head>, and <body>.
- Include CSS inside <style> tags.
- Include JavaScript inside <script> tags when required.
- Use Tailwind CSS CDN when appropriate.
- Make the page fully responsive.
- Make the UI functional where applicable.
- Preserve the requested structure.
- Preserve the requested colors.
- Preserve the requested components.
- Preserve the requested layout.
- Do not invent unrelated sections.
- Do not add unnecessary pages.
- Do not output anything before <!DOCTYPE html>.
- Do not output anything after </html>.

UI REQUIREMENTS:

{prompt}

"""

        # Determine TLS verification based on config
        verify_ssl = Config.GROQ_TLS_VERIFY
        ca_bundle = Config.GROQ_CA_BUNDLE
        
        if verify_ssl and ca_bundle:
            verify = ca_bundle
        else:
            verify = verify_ssl

        # Call Groq
        client = OpenAI(
            api_key=Config.UIDESIGN_GROQ_API_KEY,
            base_url=Config.GROQ_BASE_URL,
            http_client=httpx.Client(
                verify=verify,
                timeout=180
            )
        )

        response = client.chat.completions.create(
            model=Config.UIDESIGN_GROQ_GENERATOR_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": """

You are a senior frontend engineer and UI/UX designer.

Your task is to generate a complete, production-quality
HTML webpage from the user's UI requirements.

OUTPUT FORMAT IS STRICT:

Return ONLY one complete HTML5 document.

The response MUST:

- Start with <!DOCTYPE html>
- Contain <html>
- Contain <head>
- Contain <body>
- End with </html>

DO NOT:

- Return explanations
- Return analysis
- Return reasoning
- Return a design prompt
- Return a thinking process
- Return <think> tags
- Return Markdown
- Return code fences
- Return commentary before the HTML
- Return commentary after the HTML

DESIGN REQUIREMENTS:

- Modern professional UI
- Responsive desktop and mobile layout
- Clean spacing
- Professional typography
- Accessible components
- Realistic English UI text
- Production-quality HTML
- Follow the user's requested page structure
- Preserve requested components
- Preserve requested colors
- Preserve requested layout
- Do not invent unrelated sections

Use Tailwind CSS CDN where useful.

Return ONLY the HTML document.

"""
                },
                {
                    "role": "user",
                    "content":
                    html_instruction
                }
            ],
            temperature=0.2,
            max_completion_tokens=4500
        )

        # Read Groq response
        if not response.choices:
            print(
                "ERROR: Groq returned no choices"
            )
            return None

        raw_html = (
            response
            .choices[0]
            .message
            .content
        )

        if not raw_html:
            print(
                "ERROR: Groq returned empty content"
            )
            return None

        # Debug raw response
        print("\nRAW RESPONSE PREVIEW:")
        print(
            raw_html[:1500]
        )

        print(
            "\nRaw response characters:",
            len(raw_html)
        )

        # Clean response
        html = clean_html_response(
            raw_html
        )

        # Save HTML directly without validation
        print(
            "\nHTML received from Groq."
        )

        print(
            "Saving generated response..."
        )

        # Create generated directory
        generated_dir = os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "generated"
        )
        
        os.makedirs(
            generated_dir,
            exist_ok=True
        )

        # Create unique file name
        filename = (
            "ui_"
            + str(uuid.uuid4())
            + ".html"
        )

        filepath = os.path.join(
            generated_dir,
            filename
        )

        # Save HTML
        with open(
            filepath,
            "w",
            encoding="utf-8"
        ) as file:
            file.write(html)

        # Success
        print(
            "\n==================================="
        )

        print(
            "HTML GENERATION SUCCESS"
        )

        print(
            "==================================="
        )

        print(
            "\nGenerated HTML Saved:"
        )

        print(
            filepath
        )

        print(
            "\nHTML characters:",
            len(html)
        )

        # Return file name
        return filename

    # Error handling
    except Exception as e:
        print(
            "\n==================================="
        )

        print(
            "HTML GENERATOR ERROR"
        )

        print(
            "==================================="
        )

        print(
            f"Error type: {type(e).__name__}"
        )

        print(
            f"Error message: {str(e)}"
        )

        traceback.print_exc()

        return None
