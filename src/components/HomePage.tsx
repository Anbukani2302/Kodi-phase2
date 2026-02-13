import React from "react";
import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Send, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { postService, Post } from '../services/postService';

export default function HomePage() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [posting, setPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await postService.getPosts();
      setPosts(response.results || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !selectedImage) return;

    try {
      setPosting(true);
      await postService.createPost({
        content: postContent,
        image: selectedImage,
      });

      setPostContent('');
      setSelectedImage(null);
      setImagePreview('');
      loadPosts();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (post?.is_liked) {
        await postService.unlikePost(postId);
      } else {
        await postService.likePost(postId);
      }
      loadPosts();
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleComment = async (postId: number) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;

    try {
      await postService.createComment(postId, content);
      setCommentInputs({ ...commentInputs, [postId]: '' });
      loadPosts();
    } catch (error) {
      console.error('Failed to comment:', error);
    }
  };

  const handleShare = async (postId: number) => {
    try {
      await postService.sharePost(postId);
      loadPosts();
    } catch (error) {
      console.error('Failed to share post:', error);
    }
  };

  const toggleComments = (postId: number) => {
    setShowComments({ ...showComments, [postId]: !showComments[postId] });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Hero Section - Family Tree Roadmap */}
        <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-3xl p-8 shadow-sm">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-green-800">
              {t('familyTreeTitle')}
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-green-500 to-green-300 mx-auto rounded-full"></div>
            <p className="text-green-900 leading-relaxed text-lg max-w-3xl mx-auto">
              {t('familyTreeContent')}
            </p>
          </div>
        </div>

        {/* Create Post */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <form onSubmit={handleCreatePost} className="space-y-4">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder={t('whatsOnMind')}
              rows={3}
            />

            {imagePreview && (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview('');
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
                <ImageIcon className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">{t('upload')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={posting || (!postContent.trim() && !selectedImage)}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg font-medium hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {posting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {t('loading')}
                  </>
                ) : (
                  t('post')
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Post Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {post.user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{post.user.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString('ta-IN')}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-gray-800 mb-4">{post.content}</p>

              {/* Post Image */}
              {post.image && (
                <img src={post.image} alt="Post" className="w-full rounded-lg mb-4" />
              )}

              {/* Post Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4 pb-4 border-b">
                <span>{post.likes_count} {t('like')}</span>
                <div className="flex space-x-4">
                  <span>{post.comments_count} {t('comment')}</span>
                  <span>{post.shares_count} {t('share')}</span>
                </div>
              </div>

              {/* Post Actions */}
              <div className="flex items-center justify-around">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${post.is_liked
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <Heart className={`h-5 w-5 ${post.is_liked ? 'fill-current' : ''}`} />
                  <span className="font-medium">{t('like')}</span>
                </button>

                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="font-medium">{t('comment')}</span>
                </button>

                <button
                  onClick={() => handleShare(post.id)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                  <span className="font-medium">{t('share')}</span>
                </button>
              </div>
            </div>

            {/* Comments Section */}
            {showComments[post.id] && (
              <div className="bg-gray-50 p-6 pt-4 border-t">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={commentInputs[post.id] || ''}
                    onChange={(e) =>
                      setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                    }
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder={t('writeComment')}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleComment(post.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleComment(post.id)}
                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">இதுவரை பதிவுகள் இல்லை</p>
          </div>
        )}
      </div>
    </div>
  );
}
