export type ApiUser = {
  id: number;
  email: string;
  createdAt: string;
};

export type ApiPost = {
  id: number;
  title: string;
  text: string;
  tags: string[];
  publishedAt: string;
  userId: number;
  authorEmail: string;
};

export type ClientSession = {
  token: string;
  user: Pick<ApiUser, "id" | "email">;
};

export type CreatePostInput = {
  title: string;
  text: string;
  tags: string[];
};

export type UpdatePostInput = Partial<CreatePostInput>;
