<div align="center">
  <h1 align="center">Alexandria: AI-Powered Research Assistant</h1>
  <img width="1499" alt="alexandria_home" src="https://github.com/user-attachments/assets/e3e622dc-ece6-47eb-9fcd-cb397294b498">
</div>

## Introduction 🚀

Alexandria is an AI-powered research companion designed to revolutionize how you access, understand, and build upon academic knowledge. With Alexandria, you can upload your research papers to our intelligent library and engage in insightful conversations with your documents. Our platform also allows you to explore a vast collection of public research by interacting with studies from various fields.

## Features ✨

- **Intelligent Document Interaction**: Upload your papers and engage in conversations with them using our advanced AI system.
- **Vast Research Library**: Explore a comprehensive collection of research papers and academic resources covering a wide range of topics.
- **Real-Time AI Support**: Get instant answers to your questions to enhance your understanding of complex subjects.
- **Data Privacy Promise**: Your data is never used for training or shared with third parties, ensuring the highest standards of privacy and integrity.

## Tech Stack 🛠️

### Frontend
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

### Backend
[![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://golang.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

### Deployment
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

### Authentication
[![GitHub](https://img.shields.io/badge/GitHub_OAuth-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/)
[![Google](https://img.shields.io/badge/Google_OAuth-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/identity)

## Getting Started 🏁

### Prerequisites
- Docker installed on your local machine
- Git installed on your local machine

### Setup Instructions
1. Clone the repository:
   ```bash
    git clone https://github.com/[YourUsername]/alexandria.git
    cd alexandria
   ```
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file in the root directory with the following content:
   ```
    MONGODB_DB_NAME=[Your MongoDB database name]
    MONGODB_COLLECTION=[Your MongoDB collection name]
    ATLAS_CONNECTION_STRING=[Your MongoDB Atlas connection string]
    
    OPENAI_API_KEY=[Your OpenAI API key]
    
    SESSION_SECRET=[Your session secret]
    
    GITHUB_CLIENT_ID=[Your GitHub OAuth client ID]
    GITHUB_CLIENT_SECRET=[Your GitHub OAuth client secret]
    
    GOOGLE_CLIENT_ID=[Your Google OAuth client ID]
    GOOGLE_CLIENT_SECRET=[Your Google OAuth client secret]
    
    MYSQL_USER=[Your MySQL username]
    MYSQL_PASSWORD=[Your MySQL password]
    MYSQL_ROOT_PASSWORD=[Your MySQL root password]
    MYSQL_HOST=[Your MySQL host, e.g., localhost]
    MYSQL_PORT=[Your MySQL port, default is 3306]
    MYSQL_DATABASE=[Your MySQL database name]
   ```
4. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```
5. Open your browser and navigate to `http://localhost:80`

## Contributing 🤝

We welcome contributions to Alexandria! If you'd like to contribute, please follow these steps:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a pull request to the `main` branch of the original repository

## What's Next? 🚀

- **Collaborative Features**: Implement tools for researchers to collaborate and share insights within the platform.
- **Community Forms**: Launch discussion forums where users can ask questions, share insights, and collaborate on research topics.
- **Personalized Recommendations**: DIntroduce a recommendation system that suggests papers and resources based on user interests and previous interactions.

## License 📜

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Contact 📧
Alexandria Support - [alexandria.dev@gmail.com]
