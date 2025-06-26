from fastapi import FastAPI, UploadFile, File, Form
from typing import List
import torch
import librosa
import tempfile
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor

app = FastAPI(title="MERaLiON-2-3B Audio Server")

# Load model and processor once (GPU)
repo_id = "MERaLiON/MERaLiON-2-3B"
device = "cuda"

processor = AutoProcessor.from_pretrained(repo_id, trust_remote_code=True)
model = AutoModelForSpeechSeq2Seq.from_pretrained(
    repo_id,
    use_safetensors=True,
    trust_remote_code=True,
    attn_implementation="flash_attention_2",
    torch_dtype=torch.bfloat16,
).to(device)

prompt_template = "Instruction: {query} \nFollow the text instruction based on the following audio: <SpeechHere>"


@app.get("/")
def home():
    return {"responses": "API Working"}


@app.get("/ping")
def ping():
    return {"responses": "Ping API Working"}


@app.post("/process-audio/")
async def process_audio(
    files: List[UploadFile] = File(...), instruction: str = Form("transcribe")
):
    # Set instruction type
    if instruction == "transcribe":
        prompt_text = "Please transcribe this speech."
    elif instruction == "translate":
        prompt_text = "Can you please translate this speech into written Chinese?"
    else:
        return {"error": "Invalid instruction type. Use 'transcribe' or 'translate'."}

    # Prepare conversation prompts
    conversation = [
        [{"role": "user", "content": prompt_template.format(query=prompt_text)}]
        for _ in files
    ]

    chat_prompt = processor.tokenizer.apply_chat_template(
        conversation=conversation, tokenize=False, add_generation_prompt=True
    )

    audio_arrays = []
    for file in files:
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        audio_array, _ = librosa.load(tmp_path, sr=16000)
        audio_arrays.append(audio_array)

    # Process input
    inputs = processor(text=chat_prompt, audios=audio_arrays)
    for key, value in inputs.items():
        if isinstance(value, torch.Tensor):
            inputs[key] = inputs[key].to(device)
            if value.dtype == torch.float32:
                inputs[key] = inputs[key].to(torch.bfloat16)

    # Generate response
    outputs = model.generate(**inputs, max_new_tokens=256)
    generated_ids = outputs[:, inputs["input_ids"].size(1) :]
    responses = processor.batch_decode(generated_ids, skip_special_tokens=True)

    return {"responses": responses}
