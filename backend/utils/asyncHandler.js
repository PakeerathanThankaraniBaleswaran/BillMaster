// Wrapper function to catch async errors
// Instead of using try-catch in every async function, we wrap them with this
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

