/**
 * Balance Calculator Utilities
 *
 * Applies or reverses expense impacts on group member balances.
 * Handles both registered users (userId) and guests (guestName).
 * Guests are skipped since they have no account balance to track.
 */

/**
 * Find a group member by userId, comparing stringified ObjectIds.
 * Returns undefined (rather than throwing) if not found.
 */
function findMember(group, userId) {
  if (!userId) return undefined;
  const id = userId.toString();
  return group.members.find(
    (m) => !m.isGuest && m.userId && m.userId.toString() === id
  );
}

/**
 * Apply an expense to group member balances.
 *
 * - Credits the paidBy user by the full expense amount.
 * - Debits each split's user by their split amount.
 * - Guests (no userId / isGuest) are silently skipped.
 * - Missing members are silently skipped.
 * - Mutates group.members in place.
 *
 * @param {Object} group   - Group document with a `members` array.
 * @param {Object} expense - Expense document with `paidBy`, `amount`, and `splits`.
 * @returns {Object} The modified group object.
 */
export function applyExpense(group, expense) {
  // Credit the payer
  const payer = findMember(group, expense.paidBy);
  if (payer) {
    payer.balance = (payer.balance || 0) + expense.amount;
  }

  // Debit each split participant
  if (Array.isArray(expense.splits)) {
    for (const split of expense.splits) {
      // Skip guest splits — they have no account balance
      if (!split.userId) continue;

      const member = findMember(group, split.userId);
      if (member) {
        member.balance = (member.balance || 0) - split.amount;
      }
    }
  }

  return group;
}

/**
 * Reverse an expense from group member balances.
 *
 * Exact opposite of applyExpense:
 * - Debits the paidBy user by the full expense amount.
 * - Credits each split's user by their split amount.
 * - Guests and missing members are silently skipped.
 * - Mutates group.members in place.
 *
 * @param {Object} group   - Group document with a `members` array.
 * @param {Object} expense - Expense document with `paidBy`, `amount`, and `splits`.
 * @returns {Object} The modified group object.
 */
export function reverseExpense(group, expense) {
  // Debit the payer (undo the credit)
  const payer = findMember(group, expense.paidBy);
  if (payer) {
    payer.balance = (payer.balance || 0) - expense.amount;
  }

  // Credit each split participant (undo the debit)
  if (Array.isArray(expense.splits)) {
    for (const split of expense.splits) {
      if (!split.userId) continue;

      const member = findMember(group, split.userId);
      if (member) {
        member.balance = (member.balance || 0) + split.amount;
      }
    }
  }

  return group;
}
