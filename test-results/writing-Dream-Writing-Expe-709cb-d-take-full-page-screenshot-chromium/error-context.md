# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - heading "Welcome back" [level=1] [ref=e5]
        - paragraph [ref=e6]: Sign in to continue writing
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]: Email
          - textbox "Email" [ref=e10]:
            - /placeholder: you@example.com
        - generic [ref=e11]:
          - generic [ref=e12]: Password
          - textbox "Password" [ref=e13]:
            - /placeholder: ••••••••
        - button "Sign in" [ref=e14]
      - paragraph [ref=e15]:
        - text: Don't have an account?
        - link "Sign up" [ref=e16] [cursor=pointer]:
          - /url: /signup
  - button "Open Next.js Dev Tools" [ref=e22] [cursor=pointer]:
    - img [ref=e23]
  - alert [ref=e26]
```