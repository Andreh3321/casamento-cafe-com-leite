<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The couple's workspace is a single shared JSON row (`workspaces`, slug `nossa-casamento`) gated by `workspace_members` + share code RPCs; keeps schema stable as modules change (ported from the original Manus app).
- UI lives in `src/components/NossaCasamento.tsx` with plain CSS classes in `src/styles.css`, ported verbatim from the original design.
