# Vite React Worker Starter

A modern web application built with Vite, React, and Cloudflare Workers, featuring user management, media handling, and D1 database integration.

## Features

- 🚀 **Fast Development**: Built with Vite for lightning-fast development and hot module replacement
- 🔒 **User Management**: Complete user CRUD operations with D1 database
- 📁 **Media Handling**: 
  - Image upload and display
  - Video streaming with range request support
  - R2 storage integration
- 🎨 **Modern UI**: 
  - Responsive design
  - Dark mode support
  - Clean and intuitive interface

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Cloudflare account
- Wrangler CLI

## Setup

1. Clone the repository:
```bash
git clone https://github.com/Measmonysuon/vite-react-ts.git
cd vite-react-ts
```

2. Install dependencies:
```bash
npm install
```

3. Configure your environment:
   - Copy `.env.example` to `.env` and fill in your values
   - Copy `wrangler.example.toml` to `wrangler.toml` and update with your Cloudflare configuration
   - Never commit `.env` or `wrangler.toml` files to version control

4. Set up Cloudflare resources:
   - Create a D1 database and update the database_id in wrangler.toml
   - Create an R2 bucket and update the bucket_name in wrangler.toml
   - Generate an AUTH_SECRET and update it in your environment

5. Start the development server:
```bash
npm run dev
```

## Security Notes

- Never commit sensitive files to version control:
  - `.env` files
  - `wrangler.toml` with actual credentials
  - `.dev.vars` files
  - Any files containing API keys or secrets

- Use environment variables for all sensitive configuration
- Keep your `AUTH_SECRET` secure and rotate it periodically
- Use Cloudflare's built-in security features for your Workers

## Database Setup

1. Create a D1 database:
```bash
wrangler d1 create my-database
```

2. Apply the schema:
```bash
wrangler d1 execute my-database --file=./schema.sql
```

## Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy to Cloudflare Workers:
```bash
npx wrangler deploy
```

## API Endpoints

### User Management
- `POST /api/users` - Create a new user
- `GET /api/users` - List all users

### Media Handling
- `POST /api/media/:filename` - Upload an image
- `GET /api/media/:filename` - Retrieve an image
- `GET /api/video/:filename` - Stream a video

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.tsx         # Application entry point
│   └── worker.ts        # Cloudflare Worker implementation
├── public/              # Static assets
├── dist/               # Build output
├── .env.example        # Example environment variables
├── wrangler.example.toml # Example Wrangler configuration
└── vite.config.ts      # Vite configuration
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) 
