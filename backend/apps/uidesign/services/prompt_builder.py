from openai import OpenAI
import httpx
import traceback
from config import Config


def build_prompt(analysis):
    """
    Convert sketch analysis into a UI generation prompt using Groq.
    Returns a concise prompt for the HTML generation model.
    """
    try:
        print("\n===================================")
        print("STEP 2 : BUILD PROMPT")
        print("===================================")

        # Validate input
        if not analysis:
            print(
                "WARNING: Empty analysis received."
            )
            return ""

        # Determine TLS verification based on config
        verify_ssl = Config.GROQ_TLS_VERIFY
        ca_bundle = Config.GROQ_CA_BUNDLE
        
        if verify_ssl and ca_bundle:
            verify = ca_bundle
        else:
            verify = verify_ssl

        # Groq client
        client = OpenAI(
            api_key=Config.UIDESIGN_GROQ_API_KEY,
            base_url=Config.GROQ_BASE_URL,
            http_client=httpx.Client(
                verify=verify,
                timeout=120
            )
        )

        # Groq request
        response = client.chat.completions.create(
            model=Config.UIDESIGN_GROQ_PROMPT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": """

You are a senior UI/UX designer.

Convert the provided sketch analysis and
user preferences into ONE concise prompt
for an HTML generation model.

IMPORTANT:

Return ONLY the final UI generation prompt.

DO NOT output:

- reasoning
- analysis
- thinking process
- planning
- numbered steps
- explanations
- meta commentary
- <think> tags
- Markdown headings

Do not explain your design decisions.

The output must directly describe the UI
that should be generated.

Include only the important information:

- Page type
- Overall layout
- Required components
- Component placement
- Color theme
- Typography
- Spacing
- Responsive behavior
- Important visual details
- User requirements

Preserve the important structure from
the original sketch.

Do not invent major sections that are
not present in the sketch.

Keep the final prompt concise.

Target approximately 500-900 words.

Never return a thinking process.
Never return analysis.
Return only the final UI prompt.

"""
                },
                {
                    "role": "user",
                    "content": analysis
                }
            ],
            temperature=0.2,
            max_completion_tokens=1000,
        )

        # Read response
        prompt = (
            response
            .choices[0]
            .message
            .content
            or ""
        )

        prompt = prompt.strip()

        # Safety fallback
        if not prompt:
            print(
                "WARNING: Prompt builder returned empty prompt."
            )
            return analysis

        # Debug information
        print("\nGenerated Prompt:")
        print(prompt)

        print(
            "\nPrompt length:",
            len(prompt),
            "characters"
        )

        # Return final prompt
        return prompt

    except Exception:
        print(
            "\n==================================="
        )
        print(
            "PROMPT BUILDER ERROR"
        )
        print(
            "==================================="
        )
        traceback.print_exc()
        return analysis
