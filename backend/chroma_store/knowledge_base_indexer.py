# PDF processing
from langchain_community.document_loaders import PyPDFLoader
# Splitting
from langchain.text_splitter import RecursiveCharacterTextSplitter
# Embedding & Chroma DB
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv
from langchain_community.embeddings import HuggingFaceEmbeddings
# from sentence_transformers import SentenceTransformer
from langchain.retrievers import MultiQueryRetriever
from langchain.prompts import PromptTemplate
import chromadb
from langchain_chroma import Chroma # Import Chroma class for vectorstore initialization.
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage
# Groq for LLM
import groq

import os

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from jinja2 import Environment, FileSystemLoader

# Load environment variables
load_dotenv()

#API key
GROK_API_KEY = os.getenv("GROQ_API_KEY")

def create_and_save_groq_index(pdf_path: str = "mental health.pdf", index_path: str = "groq_index"):
    """
    Loads a PDF document, splits it into chunks, creates embeddings using Groq,
    and saves a Chroma vector store.
    """
    # Load the PDF document
    pdf_path = r"C:\Users\HomePC\Desktop\LuxDevHQ Internship\Mental Health Model\Mental Health.pdf"
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()

    if not documents:
        print(f"No documents found in {pdf_path}. Please provide a valid PDF file.")
        return

    # Initialize text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        add_start_index=True,
    )
    chunks = text_splitter.split_documents(documents)

    # Initialize Groq Embeddings (using HuggingFaceEmbeddings as a placeholder if Groq doesn't provide embeddings)
    # Replace HuggingFaceEmbeddings with the correct Groq embedding class if available
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # Create Chroma vector store
    print(f"Creating Chroma index with {len(chunks)} chunks...")
    vector_store = Chroma.from_documents(chunks, embeddings, persist_directory=index_path)
    print("Chroma index created.")

    # Save the Chroma index locally
    vector_store.persist()
    print(f"Chroma index saved to {index_path}")