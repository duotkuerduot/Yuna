import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.prompts import PromptTemplate
from langchain.schema import HumanMessage, AIMessage

# Load environment variables
load_dotenv()
GROK_API_KEY = os.getenv("GROQ_API_KEY")
if not GROK_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set. Please add it to your .env file.")

# Initialize FastAPI app
app = FastAPI(title="Mental Health AI Agent Backend")

# Configure CORS for frontend communication
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for RAG components
vector_store = None
rag_chain = None
chat_history = []

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default_session"

class ChatResponse(BaseModel):
    response: str
    context_sources: list[str] = []

@app.on_event("startup")
async def startup_event():
    """
    Loads the Chroma index and sets up the RAG chain when the FastAPI app starts.
    """
    global vector_store, rag_chain

    # Check if Chroma index exists
    index_path = r"C:\Users\HomePC\Desktop\LuxDevHQ Internship\Mental Health Model\backend\chroma_store"
    if not os.path.exists(index_path):
        print(f"Chroma index not found at {index_path}. Please run knowledge_base_indexer.py first.")
        raise RuntimeError("Chroma index not found. Cannot start application without knowledge base.")

    print("Loading Chroma index...")
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    vector_store = Chroma(persist_directory=index_path, embedding_function=embeddings)
    print("Chroma index loaded successfully.")

    # Initialize Groq LLM
    llm = ChatGroq(
        api_key=GROK_API_KEY,
        model_name="llama3-70b-8192",  # Or another Groq-supported model
        temperature=0.7,
    )

    # Define the prompt for contextual RAG
    prompt = PromptTemplate(
        input_variables=["context", "chat_history", "input"],
        template=(
            "You are a compassionate and supportive AI assistant specializing in mental health. "
            "Your purpose is to provide information, strategies, and encouragement based on the "
            "provided context from researched content and psychological best practices. "
            "Always prioritize empathy, non-judgment, and safety. "
            "If the question is outside the scope of mental health or you cannot find it relevant, remind them that you " \
            "only answer questions related to mental health and well-being."
            "For information outside the provided context, gently redirect the user and remind them to "
            "consult with a licensed mental health professional for personalized advice. "
            "Keep responses as concise as possible, ideally in 1-2 sentences or a few brief bullet points and"
            "avoid lengthy paragraphs or unnecessary elaboration. "
            "When appropriate, after providing an answer, always ask a relevant, open-ended follow-up question" 
            "but in an emphatic and supportive manner to better understand the user's current well-being or to offer further support."
            "When providing mental health emergency or support hotlines, always provide contact information relevant to Kenya. "
            "Do not provide hotlines for other countries, especially the USA."
            "Do not provide medical diagnoses or prescriptions. "
            "Context: {context}\n"
            "{chat_history}\n"
            "User: {input}"
        )
    )

    # Create a retriever from the vector store
    retriever = vector_store.as_retriever(search_kwargs={"k": 3})

    # Create a document combining chain
    document_chain = create_stuff_documents_chain(llm, prompt)

    # Create the retrieval chain
    rag_chain = create_retrieval_chain(retriever, document_chain)
    print("RAG chain initialized.")

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Handles incoming chat messages, performs RAG, and returns a response.
    """
    global chat_history

    if rag_chain is None:
        raise HTTPException(status_code=503, detail="AI agent not initialized. Please ensure the backend started correctly.")

    user_message = request.message
    chat_history.append(HumanMessage(content=user_message))

    try:
        response = rag_chain.invoke({
            "input": user_message,
            "chat_history": chat_history
        })

        ai_response_content = response.get("answer", "I'm sorry, I couldn't process that request.")
        context_docs = response.get("context", [])
        context_sources = [doc.metadata.get('source', 'Unknown source') for doc in context_docs if hasattr(doc, "metadata")]

        chat_history.append(AIMessage(content=ai_response_content))

        return ChatResponse(response=ai_response_content, context_sources=context_sources)

    except Exception as e:
        print(f"Error processing chat message: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while processing your request. Please try again.")

@app.get("/chat")
async def chat_get():
    return {"message": "Please use POST to interact with this endpoint."}

if __name__ == "__main__":
    import uvicorn 
    uvicorn.run(app, host="0.0.0.0", port=8000)

