// services/postService.ts
import api from './api';

export interface PostAuthor {
  id: number;
  mobile_number: string;
  name: string;
  profile_image?: string;
}

export interface PostMedia {
  id: number;
  media_type: 'image' | 'video' | 'audio' | 'document';
  file: string;
  thumbnail: string | null;
  caption: string;
}

export interface Post {
  id: number;
  author: PostAuthor;
  content: string;
  visibility: 'public' | 'connections' | 'custom';
  created_at: string;
  updated_at: string;
  engagement: {
    likes_count: number;
    comments_count: number;
    shares_count: number;
  };
  user_interaction: {
    is_liked: boolean;
    is_saved: boolean;
  };
  media_count: number;
  media?: PostMedia[];
  is_edited?: boolean;
}

export interface PostComment {
  id: number;
  post: number;
  author: PostAuthor;
  content: string;
  parent: number | null;
  replies: PostComment[];
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export const postService = {
  // Get posts feed
  getPosts: async (page: number = 1, pageSize: number = 20) => {
    const response = await api.get(`/api/posts/feed/?page=${page}&page_size=${pageSize}`);
    return response.data;
  },

  // Get posts for a specific user
  getUserPosts: async (userId: number, page: number = 1, pageSize: number = 20) => {
    const response = await api.get(`/api/posts/user/${userId}/?page=${page}&page_size=${pageSize}`);
    return response.data;
  },

  // Get single post
  getPost: async (postId: number) => {
    const response = await api.get(`/api/posts/${postId}/`);
    return response.data;
  },

  // Create post (supports FormData with files)
  createPost: async (data: FormData | { content: string; visibility?: string }) => {
    const response = await api.post('/api/posts/create/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },

  // Update post
  updatePost: async (postId: number, data: { content?: string; visibility?: string; custom_visibility_rule?: number }) => {
    const response = await api.put(`/api/posts/${postId}/update/`, data);
    return response.data;
  },

  // Delete post
  deletePost: async (postId: number) => {
    const response = await api.delete(`/api/posts/${postId}/delete/`);
    return response.data;
  },

  // Like post (Using GET as requested)
  likePost: async (postId: number) => {
    const response = await api.post(`/api/posts/${postId}/like/`);
    return response;
  },

  // Unlike post (Using GET as requested)
  unlikePost: async (postId: number) => {
    const response = await api.get(`/api/posts/${postId}/like/`);
    return response;
  },

  // Save/Unsave post
  savePost: async (postId: number) => {
    const response = await api.post(`/api/posts/${postId}/save/`);
    return response;
  },

  // Share post
  sharePost: async (postId: number, shareText?: string, platform?: string) => {
    const response = await api.post(`/api/posts/${postId}/share/`, {
      share_text: shareText || '',
      platform: platform || 'internal',
    });
    return response.data;
  },

  // Report post
  reportPost: async (postId: number, reason: string, description?: string) => {
    const response = await api.post(`/api/posts/${postId}/report/`, {
      reason,
      description: description || '',
    });
    return response.data;
  },

  // Get post comments
  getComments: async (postId: number, page: number = 1, pageSize: number = 20) => {
    const response = await api.get(`/api/posts/${postId}/comments/?page=${page}&page_size=${pageSize}`);
    return response.data;
  },

  // Create comment
  createComment: async (postId: number, data: { content: string; parent_id?: number }) => {
    const response = await api.post(`/api/posts/${postId}/comments/create/`, data);
    return response.data;
  },

  // Update comment
  updateComment: async (postId: number, commentId: number, data: { content: string }) => {
    // Note: You may need to add this endpoint to your backend
    const response = await api.put(`/api/posts/${postId}/comments/${commentId}/update/`, data);
    return response.data;
  },

  // Delete comment
  deleteComment: async (postId: number, commentId: number) => {
    // Note: You may need to add this endpoint to your backend
    const response = await api.delete(`/api/posts/${postId}/comments/${commentId}/delete/`);
    return response.data;
  },

  // Add media to existing post
  addMedia: async (postId: number, formData: FormData) => {
    const response = await api.post(`/api/posts/${postId}/media/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};