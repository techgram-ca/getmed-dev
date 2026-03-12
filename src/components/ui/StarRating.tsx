import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  reviewCount?: number;
  size?: number;
}

export default function StarRating({ rating, reviewCount, size = 14 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">
        {rating > 0 ? rating.toFixed(1) : 'No ratings'}
        {reviewCount !== undefined && reviewCount > 0 && ` (${reviewCount})`}
      </span>
    </div>
  );
}
