;; title: Keys Contract
;; version: 0.0.1
;; summary: A smart contract to manage subject keys
;; description: A Friend.tech miminal clone, part of the Hiro Hacks 2023 Hackathon
;; author: vicnicius<me@vicnicius.com>

;; Maps
(define-map keysBalance { subject: principal, holder: principal } uint)
(define-map keysSupply { subject: principal } uint)

;; Errors
(define-constant err-no-supply-available (err u100))
(define-constant err-stx-transfer-failed (err u101))
(define-constant err-invalid-sell (err u102))

;; Public fns
;; TODO: Remove supply initialization to own public function 
(define-public (buy-keys (subject principal) (amount uint))
  (let
    (
      (supply (default-to u0 (map-get? keysSupply { subject: subject })))
      (price (get-price supply amount))
    )
    (if (or (> supply u0) (is-eq tx-sender subject))
      (begin
        (match (stx-transfer? price tx-sender (as-contract tx-sender))
          success
          (begin
            (map-set keysBalance { subject: subject, holder: tx-sender }
              (+ (default-to u0 (map-get? keysBalance { subject: subject, holder: tx-sender })) amount)
            )
            (map-set keysSupply { subject: subject } (+ supply amount))
            (ok true)
          )
          error
          err-stx-transfer-failed
        )
      )
      err-no-supply-available
    )
  )
)

(define-public (sell-keys (subject principal) (amount uint))
  (let
    (
      (balance (default-to u0 (map-get? keysBalance { subject: subject, holder: tx-sender })))
      (supply (default-to u0 (map-get? keysSupply { subject: subject })))
      (recipient tx-sender)
    )
    (if (and (>= balance amount) (or (> supply u0) (is-eq tx-sender subject)))
      (begin
        (asserts! (>= supply amount) err-invalid-sell)
        (let
          (
            (price (get-price (- supply amount) amount))
          )
          (match (as-contract (stx-transfer? price tx-sender recipient))
            success
            (begin
              (map-set keysBalance { subject: subject, holder: tx-sender } (- balance amount))
              (map-set keysSupply { subject: subject } (- supply amount))
              (ok true)
            )
            error
            err-stx-transfer-failed
          )
        )
      )
      err-invalid-sell
    )
  )
)

(define-private (get-price (supply uint) (amount uint))
  (let
    (
      (base-price u10)
      (price-change-factor u100)
      (adjusted-supply (+ supply amount))
    )
    (+ base-price (* amount (/ (* adjusted-supply adjusted-supply) price-change-factor)))
  )
)

(define-read-only (get-keys-supply (subject principal))
  (default-to u0 (map-get? keysSupply { subject: subject }))
)

(define-read-only (get-keys-balance (subject principal) (holder principal))
  (default-to u0 (map-get? keysBalance { subject: subject, holder: holder }))
)

(define-read-only (get-buy-price (subject principal) (amount uint))
  (let
    (
      (supply (get-keys-supply subject))
    )
    (ok (get-price supply amount)))
)

(define-read-only (get-sell-price (subject principal) (amount uint))
  (let
    (
      (supply (get-keys-supply subject))
    )
    (asserts! (>= supply amount) err-invalid-sell)
    (ok (get-price (- supply amount) amount)))
)

(define-read-only (is-keyholder (subject principal) (holder principal))
  (>= (default-to u0 (map-get? keysBalance { subject: subject, holder: holder })) u1)
)