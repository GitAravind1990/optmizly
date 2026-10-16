/**
 * Product Hunt "Find us on" badge, linking to the launch page.
 *
 * The image is a self-hosted copy of PH's featured badge (public/product-hunt-badge.svg) with
 * the live upvote counter removed: no variant PH serves omits it, and a low number read as thin
 * traction. Self-hosting also keeps api.producthunt.com out of the CSP's img-src.
 */
export function ProductHuntBadge({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <a
      href="https://www.producthunt.com/products/optmizly?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-optmizly"
      target="_blank" rel="noopener noreferrer"
      className={className}
      style={{ display: 'inline-flex', ...style }}
    >
      <img src="/product-hunt-badge.svg" alt="Optmizly on Product Hunt" width={200} height={54} />
    </a>
  )
}
