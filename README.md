# Member Management System (Full Site)

Complete full-stack app with:

- Frontend dashboard, forms, browse/reference, and polished UI
- Backend API with SQLite database
- Login and role-based access (`admin`, `viewer`)
- Exports (`CSV`) and print-to-PDF support
- Deployment-ready files (Docker + Render)

## Login Users

- Admin: `admin` / `admin123`
- Viewer: `viewer` / `viewer123`

Viewer can browse/reference. Admin can add/edit/delete members and fees.

## Local Run

1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm start`
3. Open:
   - [http://localhost:3000](http://localhost:3000)

## Export

- CSV: dashboard button `Export Members CSV`
- PDF: dashboard button `Print Current View (PDF)`

## Deployment

### Render

- Push code to GitHub
- Create new web service in Render
- Render auto-reads `render.yaml`
- Set environment variable `JWT_SECRET` (or let Render generate one)

### Docker

- Build: `docker build -t member-management .`
- Run: `docker run -p 3000:3000 member-management`
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
