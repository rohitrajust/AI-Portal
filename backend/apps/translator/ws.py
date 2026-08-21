import json
import time
from .engine import translate_to_english


def register(sock):
    @sock.route('/ws')
    def websocket(ws):
        """WebSocket handler for real-time speech translation.
        
        Protocol:
        - Client sends: {"type": "start"|"stop"|"flush"|"settings", ...}
        - Server sends: {"type": "status", "status": ...} and {"type": "translation", "japanese": ..., "english": ...}
        """
        try:
            # Send initial status
            ws.send(json.dumps({"type": "status", "status": "connected"}))
            
            is_running = False
            transcript_buffer = []
            
            while True:
                data = ws.receive()
                if data is None:
                    break
                
                try:
                    msg = json.loads(data)
                except Exception:
                    ws.send(json.dumps({"type": "status", "status": "invalid_json"}))
                    continue

                mtype = msg.get("type")
                
                if mtype == "start":
                    is_running = True
                    transcript_buffer = []
                    ws.send(json.dumps({"type": "status", "status": "listening"}))
                    
                elif mtype == "stop":
                    is_running = False
                    ws.send(json.dumps({"type": "status", "status": "stopped"}))
                    
                elif mtype in {"flush", "translate"}:
                    # Flush buffer and translate
                    direct_text = (msg.get("text") or "").strip()
                    japanese_text = direct_text or " ".join(transcript_buffer)
                    if japanese_text:
                        ws.send(json.dumps({"type": "status", "status": "translating"}))
                        
                        # Attempt real translation or use placeholder
                        try:
                            english = translate_to_english(japanese_text)
                            if english is None:
                                english = f"[placeholder translation of: {japanese_text[:50]}...]"
                        except Exception:
                            english = f"[placeholder translation of: {japanese_text[:50]}...]"
                        
                        ws.send(json.dumps({
                            "type": "translation",
                            "japanese": japanese_text,
                            "english": english
                        }))
                        transcript_buffer = []
                    
                    if is_running:
                        ws.send(json.dumps({"type": "status", "status": "listening"}))
                    else:
                        ws.send(json.dumps({"type": "status", "status": "stopped"}))
                    
                elif mtype == "settings":
                    # Accept settings updates (endpointing_ms, utterance_end_ms)
                    settings = msg.get("settings", {})
                    ws.send(json.dumps({"type": "status", "status": "settings_updated", "settings": settings}))
                    
                else:
                    ws.send(json.dumps({"type": "status", "status": "unknown_type"}))
                    
        except Exception as exc:
            try:
                ws.close()
            except Exception:
                pass
