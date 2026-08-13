import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import interview, report

# Configure application-wide logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

app = FastAPI(
    title="AI Interview Coach API",
    description="Backend service providing AI-driven technical interviewing and candidate report generation.",
    version="1.0.0"
)

# Task 4: Startup message event
@app.on_event("startup")
def startup_event():
    startup_msg = "AI Interview Coach API started successfully"
    logger.info(startup_msg)
    print(startup_msg)

# Task 2: Unhandled exception handler returning user-friendly JSON response
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "An unexpected server error occurred. Please try again later.",
            "detail": str(exc),
        },
    )

# Configure CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(interview.router)
app.include_router(report.router)


@app.get("/")
def read_root() -> dict:
    """Root health check endpoint."""
    logger.info("GET / health check requested")
    return {"message": "AI Interview Coach API is running"}


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting Uvicorn server on http://0.0.0.0:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
