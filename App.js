import React, {useEffect, useMemo, useReducer, useState} from 'react';
import { SafeAreaView, View, Text, FlatList, ScrollView, TouchableOpacity, TextInput, Image, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

/**
 * Foodie – a lightweight single-file React Native app designed to run on Expo/Expo Snack.
 * Features required by the brief:
 * - Horizontal categories bar with 10+ categories (includes "My Food").
 * - Scrollable main feed that filters by category.
 * - Detailed recipe page with: Ingredients, Instructions, Prep time, Servings, Calories, Difficulty.
 * - Favorite toggle with a heart icon and Favorites section.
 * - "My Food" area with "Add New Recipe"; user can add, edit, delete, and view full details.
 * - Functional back button across pseudo-stack navigation.
 * - Persistent data via AsyncStorage.
 *
 * NOTE: To keep Snack simple, this file can be used as App.js directly.
 */

// ---- Types / Helpers -------------------------------------------------------
const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const storageKeys = {
  recipes: 'foodie:recipes',
  favorites: 'foodie:favorites',
};

const CATEGORIES = [
  'My Food',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Snacks',
  'Soups',
  'Salads',
  'Vegan',
  'Vegetarian',
  'Keto',
  'Gluten-Free',
  'Drinks',
]; // 13 categories (>= 10 as required)

const SAMPLE_RECIPES = [
  {
    id: uuid(),
    title: 'Avocado Toast',
    category: 'Breakfast',
    image:
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1200&auto=format&fit=crop',
    ingredients: [
      '2 slices sourdough',
      '1 ripe avocado',
      'Salt & pepper',
      'Chili flakes (optional)',
      '1 tsp lemon juice',
    ],
    instructions:
      'Toast bread. Mash avocado with lemon, salt and pepper. Spread on toast. Top with chili.',
    prepTime: '10 min',
    servings: 1,
    calories: 320,
    difficulty: 'Easy',
    owner: 'sample',
  },
  {
    id: uuid(),
    title: 'Classic Caesar Salad',
    category: 'Salads',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=1200&auto=format&fit=crop',
    ingredients: [
      '1 romaine lettuce',
      'Croutons',
      'Parmesan',
      'Caesar dressing',
      'Chicken (optional)',
    ],
    instructions:
      'Chop lettuce. Toss with dressing, croutons and parmesan. Add chicken if desired.',
    prepTime: '15 min',
    servings: 2,
    calories: 280,
    difficulty: 'Easy',
    owner: 'sample',
  },
  {
    id: uuid(),
    title: 'Spaghetti Bolognese',
    category: 'Dinner',
    image:
      'https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?q=80&w=1200&auto=format&fit=crop',
    ingredients: [
      '200g spaghetti',
      '250g ground beef',
      '1 onion, 2 garlic',
      'Tomato sauce',
      'Salt, pepper, herbs',
    ],
    instructions:
      'Cook pasta. Brown beef with onion & garlic. Add sauce and simmer. Combine with pasta.',
    prepTime: '35 min',
    servings: 2,
    calories: 640,
    difficulty: 'Medium',
    owner: 'sample',
  },
];

// ---- Store (Reducer + Persistence) ----------------------------------------
const initialState = {
  recipes: SAMPLE_RECIPES,
  favorites: {}, // id => true
};

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return { ...state, ...action.payload };
    case 'add': {
      const recipes = [action.recipe, ...state.recipes];
      return { ...state, recipes };
    }
    case 'update': {
      const recipes = state.recipes.map(r => (r.id === action.recipe.id ? action.recipe : r));
      return { ...state, recipes };
    }
    case 'delete': {
      const recipes = state.recipes.filter(r => r.id !== action.id);
      const favorites = { ...state.favorites };
      delete favorites[action.id];
      return { ...state, recipes, favorites };
    }
    case 'toggleFavorite': {
      const favorites = { ...state.favorites };
      if (favorites[action.id]) delete favorites[action.id];
      else favorites[action.id] = true;
      return { ...state, favorites };
    }
    default:
      return state;
  }
}

async function saveToStorage(recipes, favorites) {
  try {
    await AsyncStorage.setItem(storageKeys.recipes, JSON.stringify(recipes));
    await AsyncStorage.setItem(storageKeys.favorites, JSON.stringify(favorites));
  } catch (e) {}
}

// ---- Pseudo Navigation (Stack) --------------------------------------------
function useStackNav(initial = { name: 'Feed' }) {
  const [stack, setStack] = useState([initial]);
  const current = stack[stack.length - 1];
  const push = (name, params) => setStack(s => [...s, { name, params }]);
  const pop = () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s));
  const reset = (name, params) => setStack([{ name, params }]);
  return { current, push, pop, reset };
}

// ---- UI Building Blocks ----------------------------------------------------
const Pill = ({ active, label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: active ? '#111827' : '#e5e7eb',
      marginRight: 8,
    }}>
    <Text style={{ color: active ? 'white' : '#111827', fontWeight: '600' }}>{label}</Text>
  </TouchableOpacity>
);

const Card = ({ children, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={{
      backgroundColor: 'white',
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 2,
    }}>
    {children}
  </TouchableOpacity>
);

function Heart({ filled, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 6 }}>
      <Text style={{ fontSize: 22 }}>{filled ? '❤️' : '🤍'}</Text>
    </TouchableOpacity>
  );
}

// ---- Screens ---------------------------------------------------------------
function Header({ title, onBack }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={{ fontSize: 20, fontWeight: '700' }}>{title}</Text>
    </View>
  );
}

function Feed({ state, dispatch, nav }) {
  const [category, setCategory] = useState('All');

  const list = useMemo(() => {
    if (category === 'All' || category === 'My Food') return state.recipes;
    return state.recipes.filter(r => r.category === category);
  }, [state.recipes, category]);

  const open = (recipe) => nav.push('Details', { recipeId: recipe.id });
  const openCategory = (c) => {
    if (c === 'My Food') nav.push('MyFood');
    else setCategory(c);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <Header title="Foodie – Recipes" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12 }}>
        <Pill label={'All'} active={category === 'All'} onPress={() => setCategory('All')} />
        {CATEGORIES.map((c) => (
          <Pill key={c} label={c} active={category === c} onPress={() => openCategory(c)} />
        ))}
      </ScrollView>

      <Text style={{ marginTop: 10, marginHorizontal: 12, fontWeight: '700' }}>
        {category === 'All' ? 'All Recipes' : `${category} Recipes`}
      </Text>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <Card onPress={() => open(item)}>
            <Image source={{ uri: item.image }} style={{ height: 180 }} resizeMode="cover" />
            <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{item.title}</Text>
                <Text style={{ color: '#6b7280', marginTop: 2 }}>{item.category} · {item.prepTime} · {item.difficulty}</Text>
              </View>
              <Heart
                filled={!!state.favorites[item.id]}
                onPress={() => dispatch({ type: 'toggleFavorite', id: item.id })}
              />
            </View>
          </Card>
        )}
      />

      <View style={{ paddingHorizontal: 12, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => nav.push('Favorites')} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ fontWeight: '600' }}>♥ Favorites</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Details({ state, dispatch, nav, route }) {
  const recipe = state.recipes.find((r) => r.id === route.recipeId);
  if (!recipe) return <SafeAreaView><Header title="Recipe" onBack={nav.pop} /><Text>Not found.</Text></SafeAreaView>;

  const isFav = !!state.favorites[recipe.id];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <Header title={recipe.title} onBack={nav.pop} />
      <Image source={{ uri: recipe.image }} style={{ width: '100%', height: 240 }} resizeMode="cover" />
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>{recipe.category} • {recipe.prepTime} • Serves {recipe.servings}</Text>
          <Heart filled={isFav} onPress={() => dispatch({ type: 'toggleFavorite', id: recipe.id })} />
        </View>
        <Text style={{ marginTop: 6 }}>Calories: <Text style={{ fontWeight: '700' }}>{recipe.calories}</Text> • Difficulty: <Text style={{ fontWeight: '700' }}>{recipe.difficulty}</Text></Text>

        <Text style={{ marginTop: 14, fontWeight: '700', fontSize: 16 }}>Ingredients</Text>
        {recipe.ingredients.map((ing, i) => (
          <Text key={i} style={{ color: '#374151', marginTop: 4 }}>• {ing}</Text>
        ))}

        <Text style={{ marginTop: 14, fontWeight: '700', fontSize: 16 }}>Instructions</Text>
        <Text style={{ color: '#374151', marginTop: 4 }}>{recipe.instructions}</Text>
      </View>

      {recipe.owner !== 'sample' && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 20 }}>
          <TouchableOpacity onPress={() => nav.push('AddEdit', { mode: 'edit', recipe })}>
            <Text style={{ padding: 12, backgroundColor: '#111827', color: 'white', borderRadius: 8 }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Delete recipe?', 'This cannot be undone', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete', style: 'destructive', onPress: () => {
                    dispatch({ type: 'delete', id: recipe.id });
                    nav.pop();
                  }
                }
              ]);
            }}
          >
            <Text style={{ padding: 12, backgroundColor: '#ef4444', color: 'white', borderRadius: 8 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function Favorites({ state, nav }) {
  const list = state.recipes.filter(r => state.favorites[r.id]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <Header title="Favorites" onBack={nav.pop} />
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <Card onPress={() => nav.push('Details', { recipeId: item.id })}>
            <Image source={{ uri: item.image }} style={{ height: 160 }} />
            <View style={{ padding: 12 }}>
              <Text style={{ fontWeight: '700' }}>{item.title}</Text>
              <Text style={{ color: '#6b7280' }}>{item.category}</Text>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function MyFood({ state, nav }) {
  const mine = state.recipes.filter(r => r.owner !== 'sample');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <Header title="My Food" onBack={nav.pop} />
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => nav.push('AddEdit', { mode: 'add' })}>
          <Text style={{ backgroundColor: '#10b981', color: 'white', alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}>＋ Add New Recipe</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={mine}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <Text style={{ padding: 20, color: '#6b7280' }}>No recipes yet. Tap "Add New Recipe" to begin.</Text>
        )}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <Card onPress={() => nav.push('Details', { recipeId: item.id })}>
            <Image source={{ uri: item.image }} style={{ height: 160 }} />
            <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontWeight: '700' }}>{item.title}</Text>
                <Text style={{ color: '#6b7280' }}>{item.category}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => nav.push('AddEdit', { mode: 'edit', recipe: item })}>
                  <Text style={{ paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#111827', color: 'white', borderRadius: 8 }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => nav.push('Details', { recipeId: item.id })}>
                  <Text style={{ paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#2563eb', color: 'white', borderRadius: 8 }}>Open</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

function AddEdit({ state, dispatch, nav, route }) {
  const editing = route.mode === 'edit';
  const base = editing ? route.recipe : {
    id: uuid(),
    title: '',
    category: 'Dinner',
    image: '',
    ingredients: [],
    instructions: '',
    prepTime: '20 min',
    servings: 1,
    calories: 0,
    difficulty: 'Easy',
    owner: 'me',
  };

  const [title, setTitle] = useState(base.title);
  const [category, setCategory] = useState(base.category);
  const [image, setImage] = useState(base.image);
  const [ingredients, setIngredients] = useState(base.ingredients.join('\n'));
  const [instructions, setInstructions] = useState(base.instructions);
  const [prepTime, setPrepTime] = useState(base.prepTime);
  const [servings, setServings] = useState(String(base.servings));
  const [calories, setCalories] = useState(String(base.calories));
  const [difficulty, setDifficulty] = useState(base.difficulty);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need media library permission to pick an image.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (!res.canceled) {
        setImage(res.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Image Picker Error', String(e?.message || e));
    }
  };

  const save = () => {
    if (!title.trim()) return Alert.alert('Missing title', 'Please enter a recipe name.');
    const recipe = {
      id: base.id,
      title: title.trim(),
      category,
      image: image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
      ingredients: ingredients
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean),
      instructions: instructions.trim(),
      prepTime: prepTime.trim() || '20 min',
      servings: Number(servings) || 1,
      calories: Number(calories) || 0,
      difficulty: difficulty || 'Easy',
      owner: 'me',
    };
    if (editing) dispatch({ type: 'update', recipe });
    else dispatch({ type: 'add', recipe });
    nav.reset('MyFood');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <Header title={editing ? 'Edit Recipe' : 'Add New Recipe'} onBack={nav.pop} />
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Text style={styles.label}>Recipe name</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="My tasty dish" />

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {CATEGORIES.filter(c => c !== 'My Food').map(c => (
            <Pill key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <Text style={styles.label}>Image</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput style={[styles.input, { flex: 1 }]} value={image} onChangeText={setImage} placeholder="Paste image URL or pick below" />
          <TouchableOpacity onPress={pickImage} style={{ marginLeft: 8 }}>
            <Text style={{ backgroundColor: '#111827', color: 'white', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 }}>Pick</Text>
          </TouchableOpacity>
        </View>
        {image ? (
          <Image source={{ uri: image }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
        ) : null}

        <Text style={styles.label}>Ingredients list (one per line)</Text>
        <TextInput
          style={[styles.input, { height: 110 }]} multiline value={ingredients} onChangeText={setIngredients}
          placeholder={'e.g.\n2 eggs\n1 cup milk\n…'}
        />

        <Text style={styles.label}>Step-by-step instructions</Text>
        <TextInput style={[styles.input, { height: 120 }]} multiline value={instructions} onChangeText={setInstructions} placeholder={'Write the steps here…'} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Prep time</Text>
            <TextInput style={styles.input} value={prepTime} onChangeText={setPrepTime} placeholder="20 min" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Servings</Text>
            <TextInput style={styles.input} value={servings} onChangeText={setServings} keyboardType="numeric" placeholder="2" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Calories</Text>
            <TextInput style={styles.input} value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="450" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Difficulty</Text>
            <TextInput style={styles.input} value={difficulty} onChangeText={setDifficulty} placeholder="Easy/Medium/Hard" />
          </View>
        </View>

        <TouchableOpacity onPress={save} style={{ marginTop: 14 }}>
          <Text style={{ backgroundColor: '#10b981', color: 'white', textAlign: 'center', paddingVertical: 14, borderRadius: 12, fontWeight: '700' }}>Save Recipe</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Root -----------------------------------------------------------------
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const nav = useStackNav();

  // load persisted
  useEffect(() => {
    (async () => {
      try {
        const [r, f] = await Promise.all([
          AsyncStorage.getItem(storageKeys.recipes),
          AsyncStorage.getItem(storageKeys.favorites),
        ]);
        const payload = {};
        if (r) payload.recipes = JSON.parse(r);
        if (f) payload.favorites = JSON.parse(f);
        if (Object.keys(payload).length) dispatch({ type: 'load', payload });
      } catch (e) {}
    })();
  }, []);

  // persist on changes
  useEffect(() => {
    saveToStorage(state.recipes, state.favorites);
  }, [state.recipes, state.favorites]);

  const screen = (() => {
    switch (nav.current.name) {
      case 'Feed':
        return <Feed state={state} dispatch={dispatch} nav={nav} />;
      case 'Details':
        return <Details state={state} dispatch={dispatch} nav={nav} route={nav.current.params} />;
      case 'Favorites':
        return <Favorites state={state} nav={nav} />;
      case 'MyFood':
        return <MyFood state={state} nav={nav} />;
      case 'AddEdit':
        return <AddEdit state={state} dispatch={dispatch} nav={nav} route={nav.current.params} />;
      default:
        return <Text>Unknown screen</Text>;
    }
  })();

  return <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>{screen}</SafeAreaView>;
}

const styles = {
  label: { fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
};
