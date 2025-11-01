# Contributing to Fantasy Pet League

Thank you for your interest in contributing! 🎉

## How to Contribute

### 1. Report Bugs
- Check if the bug has already been reported in [Issues](https://github.com/yourname/fantasy-pet-league/issues)
- If not, create a new issue with:
  - Clear title and description
  - Steps to reproduce
  - Expected vs actual behavior
  - Environment details (OS, browser, Node version, etc.)

### 2. Suggest Features
- Open an issue with the `enhancement` label
- Describe the feature and why it would be useful
- Include examples or mockups if applicable

### 3. Submit Code Changes

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes:**
   - Follow existing code style
   - Add comments for complex logic
   - Keep commits atomic and descriptive

4. **Test your changes:**
   ```bash
   npm run dev  # Backend
   python daily_scraper.py  # Scraper (if modified)
   ```

5. **Commit with clear messages:**
   ```bash
   git commit -m "Add feature: description of what you added"
   ```

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request:**
   - Reference any related issues
   - Describe your changes clearly
   - Include screenshots for UI changes

## Code Style

### JavaScript/Node.js
- Use `const`/`let` (no `var`)
- 2-space indentation
- Comment non-obvious code
- Use meaningful variable names

Example:
```javascript
const authenticateToken = (req, res, next) => {
  // Check for JWT token in Authorization header
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  // Verify token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
```

### Python
- Follow PEP 8
- Use 4-space indentation
- Add docstrings to functions
- Use type hints where possible

Example:
```python
def get_breed_points(breed: str) -> int:
    """
    Get points value for a specific breed.
    
    Args:
        breed: Breed name to look up
        
    Returns:
        Points value for breed (default 1)
    """
    conn = get_db_connection()
    # ... implementation
```

## Testing

Before submitting a PR:

1. **Test locally:**
   ```bash
   # Backend
   npm run dev
   
   # Database
   psql fantasy_pet_league < schema.sql
   
   # Scraper (if changed)
   python daily_scraper.py
   ```

2. **Test admin dashboard:**
   - Visit http://localhost:3000/admin-dashboard
   - Test breed points CRUD operations
   - Verify stats display correctly

3. **Test Discord bot (if changed):**
   - Run commands in test Discord server
   - Verify notifications work

## Database Changes

If your changes require schema modifications:

1. Create migration file: `migrations/001_description.sql`
2. Update `schema.sql` with the complete schema
3. Test on fresh database: `createdb test && psql test < schema.sql`
4. Document changes in PR

## Documentation

- Update README.md if adding features
- Update setup docs if installation changes
- Add comments for complex code
- Update relevant .md files in docs/

## Pull Request Checklist

- [ ] Code follows style guidelines
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] Tests passing locally
- [ ] No breaking changes (or documented)
- [ ] Related issues referenced

## Questions?

- Check existing issues and discussions
- Create a new discussion for questions
- Ask in the community Discord (if available)

## License

By contributing, you agree your changes will be licensed under the MIT License.

---

Happy contributing! 🚀
