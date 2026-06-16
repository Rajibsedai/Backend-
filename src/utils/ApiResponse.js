class ApiResponse {
    constructor(statusCode, message="Success", data = null,success) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statusCode < 400;
    }
}