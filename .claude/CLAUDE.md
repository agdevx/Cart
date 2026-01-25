# Project-Specific Instructions for AGDevX.Cart

## Project Structure

**Monorepo Structure**: This project is organized as a monorepo with the following structure:

```
AGDevX.Cart/
├── .claude/
├── backend/                          # All .NET API code lives here
│   ├── AGDevX.Cart.slnx             # Solution file is inside backend/
│   ├── AGDevX.Cart.Api/
│   ├── AGDevX.Cart.Services/
│   ├── AGDevX.Cart.Auth/
│   ├── AGDevX.Cart.Data/
│   ├── AGDevX.Cart.Shared/
│   └── Tests/
├── frontend/                         # React frontend (when implemented)
├── docs/
└── README.md
```

**Important**: All .NET backend code, including the `.slnx` solution file, is located in the `backend/` folder. This is the correct structure for this monorepo. When working with the backend:
- Run `dotnet` commands from the `backend/` directory
- The solution file is at `backend/AGDevX.Cart.slnx`
- All project paths are relative to `backend/`

## Backend Development

When running backend commands:
```bash
cd backend
dotnet build
dotnet test
dotnet run --project AGDevX.Cart.Api
```

## Git Workflow

- No co-authorship in commits (user explicitly requested removal)
- Commit messages should be concise and descriptive
- Follow conventional commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
