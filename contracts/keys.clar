;; title: Keys Contract
;; version: 0.0.1
;; summary: A smart contract to manage subject keys
;; description: A Friend.tech miminal clone, part of the Hiro Hacks 2023 Hackathon
;; author: vicnicius<me@vicnicius.com>

;; Protocol Fees
(define-data-var priceChangeFactor uint u100)
(define-data-var basePrice uint u10)
(define-data-var protocolFeePercent uint u5)
(define-data-var protocolFeeDestination principal tx-sender)

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
      (fee (get-fee price))
    )
    (if (or (> supply u0) (is-eq tx-sender subject))
      (begin
        (try! (if (> fee u0) (stx-transfer? fee tx-sender (var-get protocolFeeDestination)) (ok true)))
        (try! (stx-transfer? price tx-sender (as-contract tx-sender)))
        (map-set keysBalance { subject: subject, holder: tx-sender }
          (+ (default-to u0 (map-get? keysBalance { subject: subject, holder: tx-sender })) amount)
        )
        (map-set keysSupply { subject: subject } (+ supply amount))
        (ok true))
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
            (fee (get-fee price)))
          (begin
            (try! ( if (> fee u0) (stx-transfer? fee recipient (var-get protocolFeeDestination)) (ok true)))
            (try! (as-contract (stx-transfer? price tx-sender recipient)))
            (map-set keysBalance { subject: subject, holder: tx-sender } (- balance amount))
            (map-set keysSupply { subject: subject } (- supply amount))
            (ok true)
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
      (adjusted-supply (+ supply amount))
    )
    (+ (var-get basePrice) (* amount (/ (* adjusted-supply adjusted-supply) (var-get priceChangeFactor))))
  )
)

(define-private (get-fee (transactionPrice uint))
  (/ (* transactionPrice (var-get protocolFeePercent)) u100)
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