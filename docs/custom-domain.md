# Serving calc_OS from a custom domain

The site is published by GitHub Pages at https://zackytzu.github.io/calc_OS/. Everything needed
to serve it from your own domain is already in the repository; the steps below are the parts that
need the domain owner.

The examples use `calcos.example`. Replace it with the real domain.

## 1. Register the domain

Any registrar works. GitHub Pages does not sell domains.

## 2. Add DNS records at the registrar

For an apex domain (`calcos.example`):

| Type  | Name | Value |
|-------|------|-------|
| A     | @    | 185.199.108.153 |
| A     | @    | 185.199.109.153 |
| A     | @    | 185.199.110.153 |
| A     | @    | 185.199.111.153 |
| AAAA  | @    | 2606:50c0:8000::153 |
| AAAA  | @    | 2606:50c0:8001::153 |
| AAAA  | @    | 2606:50c0:8002::153 |
| AAAA  | @    | 2606:50c0:8003::153 |
| CNAME | www  | zackytzu.github.io |

For a subdomain only (`calc.example.com`): a single CNAME record `calc` pointing to
`zackytzu.github.io`, and no A or AAAA records.

DNS changes can take up to a day to propagate. `dig calcos.example +noall +answer` shows when the
records are live.

## 3. Tell the build about the domain

Repository Settings, Secrets and variables, Actions, Variables tab, New repository variable:

- Name: `CUSTOM_DOMAIN`
- Value: `calcos.example`

`.github/workflows/deploy.yml` reads this variable. When it is set the site is built with the base
path `/` instead of `/calc_OS/` and a `CNAME` file is written into the deployed folder.

## 4. Set the domain in GitHub Pages

Repository Settings, Pages, Custom domain: enter `calcos.example` and save. GitHub runs a DNS check;
when it passes, tick **Enforce HTTPS** (the certificate is issued automatically and can take up to
an hour).

The same setting can be made with the API:

```bash
curl -X PUT -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/ZackyTzu/calc_OS/pages \
  -d '{"cname":"calcos.example","https_enforced":true}'
```

## 5. Redeploy

Push to `main` or run the workflow from the Actions tab (Run workflow). After the deploy,
`https://calcos.example/` serves the site and the old `github.io` address redirects to it.

## 6. Optional: verify the domain for the account

GitHub profile Settings, Pages, Add a domain, then add the TXT record it shows. Verified domains
cannot be claimed by other GitHub Pages sites if the repository setting is ever removed.

## Undoing

Delete the `CUSTOM_DOMAIN` variable, clear the custom domain in Settings, Pages, and redeploy.
The site returns to https://zackytzu.github.io/calc_OS/.
