# Line Reference Test

This Markdown file tests GitHub-style line references.

## Valid Line References

- [Link to Line 3](line-file.md#L3) - This should work
- [Link to Line Range 5-8](line-file.md#L5-L8) - This should work too

## Invalid Line References

- [Link to Line 25](line-file.md#L25) - This should fail (file only has 15 lines)
- [Link to Line Range 4-30](line-file.md#L4-L30) - This should fail (range exceeds file line count)

## Section with L-Prefix

- [Link to L454 Section](line-file.md#l454) - This should work (L454 is a section name, not a line reference)
