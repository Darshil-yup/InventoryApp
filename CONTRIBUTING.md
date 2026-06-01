# Contributing Guidelines

Thank you for your interest in contributing to the Chicago Bifold Inventory project! To maintain code quality, consistency, and standard development lifecycle practices, please adhere to the following workflow and style guidelines.

---

## 1. Git Workflow & Branching Strategy

Our repository follows a structured branch management model:

*   **`main` Branch**: Production-ready code. Commits are never made directly to `main`. All changes must be merged via Pull Requests (PRs).
*   **Feature Branches**: Created from `main` for new features or bug fixes. Use descriptive naming structures:
    *   `feature/add-barcode-scanner`
    *   `bugfix/fix-login-error`
    *   `docs/update-architecture`

### Pull Request (PR) Requirements
Before merging a branch into `main`, ensure that:
1. All automated tests in the CI/CD pipeline pass successfully.
2. The code builds without errors (TypeScript compiles, Python tests pass).
3. The changes are reviewed and approved by a team lead or maintainer.

---

## 2. Commit Message Guidelines

We enforce the **Conventional Commits** specification to keep git logs clear and readable. Commit messages should follow this format:

```
<type>(<scope>): <short summary>

[optional body]
```

### Types
*   `feat`: A new feature (e.g. `feat(auth): implement HMAC PIN hashing fallback`).
*   `fix`: A bug fix (e.g. `fix(cache): invalidate projects cache on projects update`).
*   `docs`: Documentation changes (e.g. `docs: add installation instructions to README`).
*   `style`: Code style improvements (formatting, semi-colons, whitespace) without functional changes.
*   `refactor`: Code restructuring without changing runtime behavior.
*   `test`: Adding or modifying tests.
*   `chore`: Tooling updates, dependency bumps, or configuration changes.

---

## 3. Code Style & Quality Guidelines

Consistency is key to a readable and maintainable codebase.

### Backend (Python/FastAPI)
*   **Standards**: We adhere strictly to PEP8 standards.
*   **Tooling**: We use **Ruff** for fast linting and code formatting.
*   **Rules Configuration**: Defined in [pyproject.toml](file:///d:/project/Ios-Android%20app/InventoryApp-main/backend/pyproject.toml).
*   **Commands**:
    *   To run the linter: `ruff check .`
    *   To auto-format code: `ruff format .`

### Frontend (TypeScript/React Native)
*   **Standards**: We write typed TypeScript using ESLint.
*   **Formatting**: Handled by **Prettier**.
*   **Commands**:
    *   To run Prettier: `npx prettier --check .` (or `--write` to auto-format)
    *   To run ESLint: `npx eslint .`
    *   To run TypeScript compiler verification: `npx tsc --noEmit`

---

## 4. Testing Protocols

We expect 100% test coverage check-in status for all backend routes and utility functions.

*   **Test Location**: All test scripts must reside inside the [tests/](file:///d:/project/Ios-Android%20app/InventoryApp-main/tests/) directory.
*   **Mocking**: Never write tests that make physical requests to the live Google Sheets API. Mock the `gspread` client using standard Python mocking structures.
*   **Command**:
    *   To run the full test suite:
        ```bash
        cd backend
        pytest ../tests/test_backend.py -v
        ```
    *   Ensure all new endpoints are accompanied by corresponding mock unit tests in `test_backend.py`.
