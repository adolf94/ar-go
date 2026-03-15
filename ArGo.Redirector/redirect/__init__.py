import azure.functions as func
import os

def main(req: func.HttpRequest) -> func.HttpResponse:
    short_code = req.route_params.get('shortCode')
    
    # Standalone C# API URL from configuration
    api_base_url = os.environ.get("API_BASE_URL")
    
    if not api_base_url:
        return func.HttpResponse("API configuration is missing.", status_code=500)
    
    if not short_code:
        return func.HttpResponse("Short code is missing.", status_code=400)
    
    # Issue a 302 Redirect
    redirect_url = f"{api_base_url}/{short_code}"
    
    return func.HttpResponse(
        status_code=302,
        headers={
            "Location": redirect_url
        }
    )
